/** Jauge de contexte et quota de l'abonnement (F08). */

/** À partir de ce pourcentage, la jauge passe en accent. */
export const WARNING_PERCENT = 80

export interface TokenUsage {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens: number
  readonly cacheCreationTokens: number
}

/** Tokens occupés dans le contexte après un appel : tout ce qui a été envoyé, plus la réponse. */
export function contextTokensOf(usage: TokenUsage): number {
  return usage.inputTokens + usage.cacheReadTokens + usage.cacheCreationTokens + usage.outputTokens
}

export interface ContextGauge {
  readonly tokens: number
  /** `null` si la taille de la fenêtre est inconnue, ou plus petite que le contexte observé (mode 1 M non détecté). */
  readonly window: number | null
  readonly percent: number | null
  readonly warning: boolean
}

export function contextGauge(tokens: number, window: number | null): ContextGauge {
  if (window === null || window <= 0 || tokens > window) {
    return { tokens, window: null, percent: null, warning: false }
  }
  const percent = Math.round((tokens / window) * 100)
  return { tokens, window, percent, warning: percent >= WARNING_PERCENT }
}

export type QuotaWindowKind = 'session' | 'weekly' | 'weekly-model'

/** Une fenêtre de limite de l'abonnement (5 heures, semaine, semaine pour un modèle). */
export interface QuotaWindow {
  readonly kind: QuotaWindowKind
  /** Nom du modèle pour une fenêtre propre à un modèle. */
  readonly label: string | null
  /** Pourcentage utilisé, de 0 à 100. */
  readonly utilization: number
  readonly resetsAt: string | null
}

export interface PlanQuota {
  readonly windows: readonly QuotaWindow[]
  readonly fetchedAt: string
}

export const isQuotaWarning = (window: QuotaWindow): boolean => window.utilization >= WARNING_PERCENT

/** Pourcentage borné et arrondi ; `undefined` pour une valeur absente ou invalide. */
export function normalizeUtilization(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(100, Math.max(0, Math.round(value)))
}
