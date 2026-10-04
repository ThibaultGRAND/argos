import type { UsageProbe } from '../../domain/ports/usage-probe'
import {
  contextGauge,
  withWindow,
  type ContextGauge,
  type ContextLimits,
  type PlanQuota,
} from '../../domain/usage/usage'

/** Le quota n'est pas relu plus d'une fois par minute, quel que soit le déclencheur. */
export const QUOTA_MIN_INTERVAL_MS = 60_000

export interface UsageServiceOptions {
  /** `undefined` : aucun fournisseur ne sait lire son usage, les jauges restent masquées. */
  readonly probe: UsageProbe | undefined
  readonly now: () => Date
  readonly onQuota: (quota: PlanQuota) => void
  readonly log: (message: string) => void
}

/** Limites de contexte par modèle et quota de l'abonnement (F08). */
export class UsageService {
  private readonly probed = new Map<string, ContextLimits | null>()
  private readonly pendingLimits = new Map<string, Promise<ContextLimits | null>>()
  /** Fenêtres exactes rapportées par les sessions en direct : elles priment sur la sonde. */
  private readonly liveWindows = new Map<string, number>()
  private quota: PlanQuota | null = null
  private lastQuotaAttempt: number | undefined
  private pendingQuota: Promise<void> | undefined

  constructor(private readonly options: UsageServiceOptions) {}

  /** Limites d'un modèle : demandées une fois au fournisseur, corrigées par la fenêtre vue en direct. */
  async contextLimits(model: string): Promise<ContextLimits | null> {
    const probed = await this.probedLimits(model)
    const live = this.liveWindows.get(model)
    return live === undefined ? probed : withWindow(probed, live)
  }

  /** Jauge de contexte d'une session : tokens occupés rapportés aux limites de son modèle. */
  async gauge(model: string | null, tokens: number): Promise<ContextGauge> {
    return contextGauge(tokens, model === null ? null : await this.contextLimits(model))
  }

  rememberContextWindow(model: string, window: number): void {
    if (window > 0) this.liveWindows.set(model, window)
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

  private probedLimits(model: string): Promise<ContextLimits | null> {
    const known = this.probed.get(model)
    if (known !== undefined) return Promise.resolve(known)
    const probe = this.options.probe
    if (probe === undefined) return Promise.resolve(null)

    const pending = this.pendingLimits.get(model)
    if (pending !== undefined) return pending
    const request = probe
      .contextLimits(model)
      .then((limits) => {
        this.probed.set(model, limits)
        return limits
      })
      .catch((error: unknown) => {
        // Non mémorisé : une prochaine demande réessaiera.
        this.options.log(`Limites de contexte illisibles (${model}) : ${describe(error)}`)
        return null
      })
      .finally(() => this.pendingLimits.delete(model))
    this.pendingLimits.set(model, request)
    return request
  }
}

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error))
