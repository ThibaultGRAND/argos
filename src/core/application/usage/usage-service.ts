import type { UsageProbe } from '../../domain/ports/usage-probe'
import { contextGauge, type ContextGauge, type PlanQuota } from '../../domain/usage/usage'

/** Le quota n'est pas relu plus d'une fois par minute, quel que soit le déclencheur. */
export const QUOTA_MIN_INTERVAL_MS = 60_000

export interface UsageServiceOptions {
  /** `undefined` : aucun fournisseur ne sait lire son usage, les jauges restent masquées. */
  readonly probe: UsageProbe | undefined
  readonly now: () => Date
  readonly onQuota: (quota: PlanQuota) => void
  readonly log: (message: string) => void
}

/** Taille des fenêtres de contexte par modèle et quota de l'abonnement (F08). */
export class UsageService {
  private readonly windows = new Map<string, number | null>()
  private readonly pendingWindows = new Map<string, Promise<number | null>>()
  private quota: PlanQuota | null = null
  private lastQuotaAttempt: number | undefined
  private pendingQuota: Promise<void> | undefined

  constructor(private readonly options: UsageServiceOptions) {}

  /** Taille de la fenêtre d'un modèle : connue par une session en direct, sinon demandée une fois au fournisseur. */
  async contextWindow(model: string): Promise<number | null> {
    const known = this.windows.get(model)
    if (known !== undefined) return known
    const probe = this.options.probe
    if (probe === undefined) return null

    const pending = this.pendingWindows.get(model)
    if (pending !== undefined) return pending
    const request = probe
      .contextWindow(model)
      .then((window) => {
        if (!this.windows.has(model)) this.windows.set(model, window)
        return this.windows.get(model) ?? null
      })
      .catch((error: unknown) => {
        // Non mémorisé : une prochaine demande réessaiera.
        this.options.log(`Fenêtre de contexte illisible (${model}) : ${describe(error)}`)
        return null
      })
      .finally(() => this.pendingWindows.delete(model))
    this.pendingWindows.set(model, request)
    return request
  }

  /** Jauge de contexte d'une session : tokens occupés rapportés à la fenêtre de son modèle. */
  async gauge(model: string | null, tokens: number): Promise<ContextGauge> {
    return contextGauge(tokens, model === null ? null : await this.contextWindow(model))
  }

  /** Taille exacte rapportée par une session en direct : elle prime sur la sonde. */
  rememberContextWindow(model: string, window: number): void {
    if (window > 0) this.windows.set(model, window)
  }

  currentQuota(): PlanQuota | null {
    return this.quota
  }

  /** Relit le quota, au plus une fois par minute ; une lecture en cours n'est jamais doublée. */
  refreshQuota(): Promise<void> {
    const probe = this.options.probe
    if (probe === undefined) return Promise.resolve()
    if (this.pendingQuota !== undefined) return this.pendingQuota
    const now = this.options.now().getTime()
    if (this.lastQuotaAttempt !== undefined && now - this.lastQuotaAttempt < QUOTA_MIN_INTERVAL_MS) {
      return Promise.resolve()
    }
    this.lastQuotaAttempt = now
    this.pendingQuota = probe
      .quota()
      .then((quota) => {
        if (quota === null) return
        this.quota = quota
        this.options.onQuota(quota)
      })
      .catch((error: unknown) => {
        // Le dernier quota connu reste affiché.
        this.options.log(`Quota illisible : ${describe(error)}`)
      })
      .finally(() => {
        this.pendingQuota = undefined
      })
    return this.pendingQuota
  }
}

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error))
