import { tmpdir } from 'node:os'
import { query, type Query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import type { UsageProbe } from '../../../core/domain/ports/usage-probe'
import { normalizeUtilization, type PlanQuota, type QuotaWindow } from '../../../core/domain/usage/usage'
import { AsyncQueue } from './async-queue'
import type { ClaudeRuntimeConfig } from './claude-agent-runtime'

const PROBE_TIMEOUT_MS = 20_000

/**
 * Sonde d'usage de Claude (F08) : un processus de la CLI auquel aucune consigne n'est envoyée.
 * Rien n'est consommé et aucune session n'est écrite. Sans réglages utilisateur (`settingSources: []`),
 * donc sans hooks, et dans le dossier temporaire du système. Les sondes passent une par une.
 */
export class ClaudeUsageProbe implements UsageProbe {
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly config: ClaudeRuntimeConfig) {}

  contextWindow(model: string): Promise<number | null> {
    return this.probe(model, async (session) => {
      const usage = await session.getContextUsage({ detail: 'summary' })
      return typeof usage.maxTokens === 'number' && usage.maxTokens > 0 ? usage.maxTokens : null
    })
  }

  quota(): Promise<PlanQuota | null> {
    return this.probe(undefined, async (session) => {
      // API expérimentale du SDK : la réponse est lue de façon tolérante (planQuotaFrom).
      const usage = await session.usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET({ skipBehaviors: true })
      return planQuotaFrom(usage, new Date().toISOString())
    })
  }

  private probe<T>(model: string | undefined, read: (session: Query) => Promise<T>): Promise<T> {
    const next = this.queue.then(
      () => this.run(model, read),
      () => this.run(model, read),
    )
    this.queue = next.catch(() => undefined)
    return next
  }

  private async run<T>(model: string | undefined, read: (session: Query) => Promise<T>): Promise<T> {
    // Entrée jamais alimentée : la CLI démarre et répond aux requêtes de contrôle sans appeler le modèle.
    const input = new AsyncQueue<SDKUserMessage>()
    const session = query({
      prompt: input,
      options: {
        cwd: tmpdir(),
        settingSources: [],
        env: this.config.environment,
        ...(this.config.executable === undefined ? {} : { pathToClaudeCodeExecutable: this.config.executable }),
        ...(model === undefined ? {} : { model }),
      },
    })
    let timer: NodeJS.Timeout | undefined
    try {
      return await Promise.race([
        read(session),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Sonde d’usage sans réponse')), PROBE_TIMEOUT_MS)
        }),
      ])
    } finally {
      clearTimeout(timer)
      input.close()
      session.close()
    }
  }
}

type JsonRecord = Readonly<Record<string, unknown>>
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Fenêtres connues de la réponse `/usage`, dans l'ordre d'affichage. */
const namedWindows: readonly { key: string; kind: QuotaWindow['kind']; label: string | null }[] = [
  { key: 'five_hour', kind: 'session', label: null },
  { key: 'seven_day', kind: 'weekly', label: null },
  { key: 'seven_day_opus', kind: 'weekly-model', label: 'Opus' },
  { key: 'seven_day_sonnet', kind: 'weekly-model', label: 'Sonnet' },
]

/** Quota de l'abonnement à partir de la réponse `/usage` ; `null` si les limites ne s'appliquent pas. */
export function planQuotaFrom(response: unknown, fetchedAt: string): PlanQuota | null {
  if (!isRecord(response) || response['rate_limits_available'] !== true) return null
  const limits = response['rate_limits']
  if (!isRecord(limits)) return null

  const windows: QuotaWindow[] = []
  const add = (raw: unknown, kind: QuotaWindow['kind'], label: string | null): void => {
    if (!isRecord(raw)) return
    const utilization = normalizeUtilization(raw['utilization'])
    if (utilization === undefined) return
    const resetsAt = typeof raw['resets_at'] === 'string' ? raw['resets_at'] : null
    windows.push({ kind, label, utilization, resetsAt })
  }
  for (const { key, kind, label } of namedWindows) add(limits[key], kind, label)
  const scoped = limits['model_scoped']
  if (Array.isArray(scoped)) {
    for (const entry of scoped) {
      const label = isRecord(entry) && typeof entry['display_name'] === 'string' ? entry['display_name'] : null
      if (label !== null && !windows.some((window) => window.label === label)) add(entry, 'weekly-model', label)
    }
  }
  return windows.length === 0 ? null : { windows, fetchedAt }
}
