import type { FileChange, HistoryEvent } from '../../../core/domain/history/events'
import type { ToolKind } from '../../../core/domain/history/tool-kind'

/**
 * Conversion d'une ligne JSONL de Claude Code en événements normalisés (features/session_import.md).
 * Lecture tolérante : tout ce qui n'est pas compris est ignoré, jamais une cause d'échec.
 */

type JsonRecord = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)
const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : [])

const toolKinds: Readonly<Record<string, ToolKind>> = {
  Read: 'read',
  Edit: 'edit',
  MultiEdit: 'edit',
  NotebookEdit: 'edit',
  Write: 'write',
  Bash: 'command',
  Grep: 'search',
  Glob: 'search',
  ToolSearch: 'search',
  WebFetch: 'web',
  WebSearch: 'web',
  Agent: 'subagent',
  Task: 'subagent',
}

/** Préfixes de messages techniques injectés par Claude Code, qui ne sont pas des messages de l'utilisateur. */
const technicalPrefixes = ['<local-command-', '<system-reminder>', '<task-notification>', '<command-message>']

const MAX_TARGET_LENGTH = 300

export interface MappedLine {
  readonly events: readonly HistoryEvent[]
  /** Vrai si la ligne n'a produit aucun événement utile (type inconnu ou ignoré). */
  readonly ignored: boolean
}

export class ClaudeEventMapper {
  private sessionObserved = false

  /** Convertit une ligne. `sessionObserved` est émis une fois par bloc, sur la première ligne portant un `cwd`. */
  mapLine(line: string): MappedLine {
    let entry: unknown
    try {
      entry = JSON.parse(line)
    } catch (error) {
      if (error instanceof SyntaxError) return { events: [], ignored: true }
      throw error
    }
    if (!isRecord(entry)) return { events: [], ignored: true }

    const events: HistoryEvent[] = []
    const timestamp = asString(entry['timestamp'])
    const cwd = asString(entry['cwd'])
    if (!this.sessionObserved && cwd !== undefined && timestamp !== undefined) {
      this.sessionObserved = true
      events.push({
        type: 'session-observed',
        projectPath: cwd,
        occurredAt: timestamp,
        ...optional('cliVersion', asString(entry['version'])),
        ...optional('gitBranch', asString(entry['gitBranch'])),
      })
    }

    switch (entry['type']) {
      case 'custom-title':
        events.push(...title('custom', entry['customTitle']))
        break
      case 'ai-title':
        events.push(...title('generated', entry['aiTitle']))
        break
      case 'user':
        if (timestamp !== undefined) events.push(...mapUser(entry, timestamp))
        break
      case 'assistant':
        if (timestamp !== undefined) events.push(...mapAssistant(entry, timestamp))
        break
    }
    return { events, ignored: events.length === 0 }
  }
}

function optional<K extends string>(key: K, value: string | undefined): { [P in K]?: string } {
  return (value === undefined || value === '' ? {} : { [key]: value }) as { [P in K]?: string }
}

function title(source: 'custom' | 'generated', value: unknown): HistoryEvent[] {
  const text = asString(value)
  return text === undefined || text.trim() === '' ? [] : [{ type: 'title-changed', source, title: text }]
}

function mapUser(entry: JsonRecord, timestamp: string): HistoryEvent[] {
  const message = entry['message']
  if (!isRecord(message) || entry['isMeta'] === true) return []
  const externalId = asString(entry['uuid']) ?? `${timestamp}-user`
  const content = message['content']

  if (typeof content === 'string') {
    const text = userText(content)
    return text === undefined ? [] : [{ type: 'user-message', externalId, text, occurredAt: timestamp }]
  }

  const events: HistoryEvent[] = []
  const texts: string[] = []
  for (const block of asArray(content)) {
    if (!isRecord(block)) continue
    if (block['type'] === 'tool_result') {
      const toolUseId = asString(block['tool_use_id'])
      if (toolUseId === undefined) continue
      events.push({
        type: 'tool-result',
        toolCallExternalId: toolUseId,
        status: block['is_error'] === true ? 'error' : 'success',
        fileChanges: fileChanges(entry['toolUseResult']),
        occurredAt: timestamp,
      })
    } else if (block['type'] === 'text') {
      const text = userText(asString(block['text']) ?? '')
      if (text !== undefined) texts.push(text)
    } else if (block['type'] === 'image') {
      texts.push('[image]')
    }
  }
  if (texts.length > 0) {
    events.unshift({ type: 'user-message', externalId, text: texts.join('\n\n'), occurredAt: timestamp })
  }
  return events
}

/** Texte d'un message de l'utilisateur, ou `undefined` s'il s'agit d'un message technique. */
function userText(raw: string): string | undefined {
  const text = raw.trim()
  if (text === '') return undefined
  if (text.startsWith('<command-name>')) {
    const name = /<command-name>([\s\S]*?)<\/command-name>/.exec(text)?.[1]?.trim() ?? ''
    const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(text)?.[1]?.trim() ?? ''
    const command = name.startsWith('/') ? name : `/${name}`
    return args === '' ? command : `${command} ${args}`
  }
  if (technicalPrefixes.some((prefix) => text.startsWith(prefix))) return undefined
  return text
}

function mapAssistant(entry: JsonRecord, timestamp: string): HistoryEvent[] {
  const message = entry['message']
  if (!isRecord(message)) return []
  const rawModel = asString(message['model'])
  const model = rawModel === undefined || rawModel.startsWith('<') ? undefined : rawModel
  const uuid = asString(entry['uuid']) ?? `${timestamp}-assistant`

  const events: HistoryEvent[] = []
  for (const [position, block] of asArray(message['content']).entries()) {
    if (!isRecord(block)) continue
    if (block['type'] === 'text') {
      const text = (asString(block['text']) ?? '').trim()
      if (text === '') continue
      events.push({
        type: 'assistant-message',
        externalId: position === 0 ? uuid : `${uuid}:${position}`,
        text,
        occurredAt: timestamp,
        ...optional('model', model),
      })
    } else if (block['type'] === 'tool_use') {
      const externalId = asString(block['id'])
      const toolName = asString(block['name'])
      if (externalId === undefined || toolName === undefined) continue
      const input = isRecord(block['input']) ? block['input'] : {}
      events.push({
        type: 'tool-call',
        externalId,
        toolName,
        kind: toolKinds[toolName] ?? 'other',
        occurredAt: timestamp,
        ...optional('target', toolTarget(input)),
        ...optional('summary', asString(input['description'])),
        ...optional('model', model),
      })
    }
  }
  return events
}

/** Cible lisible d'un appel d'outil : fichier, commande, adresse ou recherche. */
function toolTarget(input: JsonRecord): string | undefined {
  for (const key of ['file_path', 'notebook_path', 'path', 'command', 'url', 'query', 'pattern']) {
    const value = asString(input[key])
    if (value !== undefined && value.trim() !== '') {
      const singleLine = value.replace(/\s+/g, ' ').trim()
      return singleLine.length <= MAX_TARGET_LENGTH ? singleLine : `${singleLine.slice(0, MAX_TARGET_LENGTH - 1)}…`
    }
  }
  return undefined
}

/** Fichiers modifiés, à partir du résultat structuré d'un outil d'édition (Edit, MultiEdit, Write). */
function fileChanges(result: unknown): FileChange[] {
  if (!isRecord(result)) return []
  const path = asString(result['filePath'])
  if (path === undefined) return []

  const patch = asArray(result['structuredPatch'])
  if (patch.length > 0) {
    let linesAdded = 0
    let linesRemoved = 0
    for (const hunk of patch) {
      if (!isRecord(hunk)) continue
      for (const line of asArray(hunk['lines'])) {
        if (typeof line !== 'string') continue
        if (line.startsWith('+')) linesAdded += 1
        else if (line.startsWith('-')) linesRemoved += 1
      }
    }
    return [{ path, linesAdded, linesRemoved }]
  }

  if (result['type'] === 'create') {
    const content = asString(result['content']) ?? ''
    const lines = content === '' ? 0 : content.split('\n').length - (content.endsWith('\n') ? 1 : 0)
    return [{ path, linesAdded: lines, linesRemoved: 0 }]
  }
  return []
}
