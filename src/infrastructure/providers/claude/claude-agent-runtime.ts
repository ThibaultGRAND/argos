import { randomUUID } from 'node:crypto'
import {
  query,
  type CanUseTool,
  type PermissionResult,
  type PermissionUpdate,
  type SDKMessage,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk'
import type { HistoryEvent } from '../../../core/domain/history/events'
import type { LiveEvent, PermissionDecision } from '../../../core/domain/live/live-events'
import type { AgentRuntime, LiveRun, LiveRunOptions } from '../../../core/domain/ports/agent-runtime'
import { AsyncQueue } from './async-queue'
import { contextBreakdownFrom } from './claude-context-usage'
import { mapAssistantContent, toolResult, usageOf } from './claude-event-mapper'
import { contextTokensOf } from '../../../core/domain/usage/usage'

export interface ClaudeRuntimeConfig {
  /** CLI `claude` installée ; à défaut, le SDK utilise son propre binaire. */
  readonly executable: string | undefined
  /** Environnement du shell de connexion, pour que l'agent trouve ses outils. */
  readonly environment: NodeJS.ProcessEnv
}

interface PendingPermission {
  readonly resolve: (result: PermissionResult) => void
  readonly input: Record<string, unknown>
  readonly suggestions: PermissionUpdate[] | undefined
}

const now = (): string => new Date().toISOString()

/** Pilotage de Claude avec l'Agent SDK (F05), en entrée continue : une session = un processus, plusieurs messages. */
export class ClaudeAgentRuntime implements AgentRuntime {
  constructor(private readonly config: ClaudeRuntimeConfig) {}

  start(options: LiveRunOptions, onEvent: (event: LiveEvent) => void): LiveRun {
    const input = new AsyncQueue<SDKUserMessage>()
    const permissions = new Map<string, PendingPermission>()

    const canUseTool: CanUseTool = (toolName, toolInput, context) =>
      new Promise<PermissionResult>((resolve) => {
        const requestId = randomUUID()
        permissions.set(requestId, { resolve, input: toolInput, suggestions: context.suggestions })
        context.signal.addEventListener('abort', () => {
          if (permissions.delete(requestId)) {
            resolve({ behavior: 'deny', message: 'Interrompu' })
            onEvent({ type: 'permission-resolved', requestId })
          }
        })
        onEvent({
          type: 'permission-requested',
          request: { requestId, toolName, title: context.title ?? null, target: permissionTarget(toolInput) },
        })
      })

    const session = query({
      prompt: input,
      options: {
        cwd: options.cwd,
        canUseTool,
        permissionMode: 'default',
        includePartialMessages: true,
        // Mêmes réglages, mémoire (CLAUDE.md) et skills que la CLI.
        settingSources: ['user', 'project', 'local'],
        systemPrompt: { type: 'preset', preset: 'claude_code' },
        env: this.config.environment,
        ...(this.config.executable === undefined ? {} : { pathToClaudeCodeExecutable: this.config.executable }),
        ...(options.model === undefined ? {} : { model: options.model }),
        ...(options.resumeExternalId === undefined ? {} : { resume: options.resumeExternalId }),
      },
    })

    onEvent({ type: 'status', status: 'starting' })
    void consume(session, onEvent)

    const denyAll = (): void => {
      for (const [requestId, pending] of permissions) {
        pending.resolve({ behavior: 'deny', message: 'Session arrêtée' })
        onEvent({ type: 'permission-resolved', requestId })
      }
      permissions.clear()
    }

    return {
      send: (text) => input.push({ type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null }),
      interrupt: async () => {
        await session.interrupt()
      },
      stop: () => {
        denyAll()
        input.close()
        session.close()
      },
      // Détail complet (compté par l'API de comptage des tokens, ≈ 1 s) : demandé seulement à l'ouverture du détail.
      contextBreakdown: async () => contextBreakdownFrom(await session.getContextUsage({ detail: 'full' })),
      answerPermission: (requestId, decision) => {
        const pending = permissions.get(requestId)
        if (pending === undefined) return
        permissions.delete(requestId)
        pending.resolve(permissionResult(pending, decision))
      },
    }
  }
}

function permissionResult(pending: PendingPermission, decision: PermissionDecision): PermissionResult {
  if (decision === 'deny') return { behavior: 'deny', message: "Refusé par l'utilisateur dans Argos" }
  return {
    behavior: 'allow',
    updatedInput: pending.input,
    ...(decision === 'allow-session' && pending.suggestions !== undefined
      ? { updatedPermissions: pending.suggestions }
      : {}),
  }
}

/** Cible lisible d'une demande de permission (fichier, commande, adresse). */
function permissionTarget(input: Record<string, unknown>): string | null {
  for (const key of ['file_path', 'notebook_path', 'path', 'command', 'url', 'pattern']) {
    const value = input[key]
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return null
}

/** Lit les messages du SDK jusqu'à la fin de la session et les convertit en événements en direct. */
async function consume(session: AsyncIterable<SDKMessage>, onEvent: (event: LiveEvent) => void): Promise<void> {
  let currentMessageId: string | undefined
  try {
    for await (const message of session) {
      for (const event of toLiveEvents(message, currentMessageId)) onEvent(event)
      if (message.type === 'stream_event' && message.event.type === 'message_start') {
        currentMessageId = message.event.message.id
      }
    }
    onEvent({ type: 'status', status: 'ended' })
  } catch (error) {
    onEvent({ type: 'status', status: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}

/** Conversion d'un message du SDK ; les messages des sous-agents (`parent_tool_use_id`) sont laissés à F13. */
export function toLiveEvents(message: SDKMessage, currentMessageId: string | undefined): LiveEvent[] {
  switch (message.type) {
    case 'system':
      if (message.subtype === 'init') {
        return [
          { type: 'identified', sessionExternalId: message.session_id, model: message.model },
          { type: 'status', status: 'running' },
        ]
      }
      if (message.subtype === 'session_state_changed') {
        const status = { idle: 'idle', running: 'running', requires_action: 'waiting' } as const
        return [{ type: 'status', status: status[message.state] }]
      }
      return []
    case 'stream_event': {
      const event = message.event
      if (message.parent_tool_use_id !== null || currentMessageId === undefined) return []
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        return [{ type: 'assistant-delta', messageId: currentMessageId, text: event.delta.text }]
      }
      return []
    }
    case 'assistant': {
      if (message.parent_tool_use_id !== null) return []
      const messageId = message.message.id
      const events = mapAssistantContent(message.message, message.uuid, now()).flatMap((event): LiveEvent[] =>
        event.type === 'assistant-message'
          ? [{ type: 'assistant-text', messageId, text: event.text, occurredAt: event.occurredAt }]
          : event.type === 'tool-call'
            ? [event]
            : [],
      )
      const usage = usageOf(message.message)
      if (usage !== undefined) {
        const model = typeof message.message.model === 'string' ? message.message.model : null
        events.push({ type: 'usage', model, contextTokens: contextTokensOf(usage) })
      }
      return events
    }
    case 'user': {
      if (message.parent_tool_use_id !== null) return []
      const content = message.message.content
      if (typeof content === 'string') return []
      return content.flatMap((block): LiveEvent[] => {
        const result: HistoryEvent | undefined = toolResult(block, message.tool_use_result, now())
        return result?.type === 'tool-result' ? [result] : []
      })
    }
    case 'result': {
      const windows = Object.entries(message.modelUsage ?? {}).flatMap(([model, usage]) =>
        typeof usage.contextWindow === 'number' && usage.contextWindow > 0
          ? [{ model, contextWindow: usage.contextWindow }]
          : [],
      )
      return [
        ...(windows.length > 0 ? [{ type: 'context-windows' as const, windows }] : []),
        {
          type: 'turn-completed',
          isError: message.subtype !== 'success' || message.is_error,
          durationMs: message.duration_ms,
        },
      ]
    }
    default:
      return []
  }
}
