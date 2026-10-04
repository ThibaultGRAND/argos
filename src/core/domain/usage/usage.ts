/** Jauge de contexte et quota de l'abonnement (F08). */

/** Vigilance (ocre) à partir de 50 %, alerte (brique) à partir de 80 %. */
export const CAUTION_PERCENT = 50
export const WARNING_PERCENT = 80

export type GaugeLevel = 'normal' | 'caution' | 'warning'

export function levelOf(percent: number): GaugeLevel {
  if (percent >= WARNING_PERCENT) return 'warning'
  if (percent >= CAUTION_PERCENT) return 'caution'
  return 'normal'
}

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

/** Limites de contexte d'un modèle, telles que données par le fournisseur. */
export interface ContextLimits {
  readonly window: number
  /** Seuil du compactage automatique ; `null` s'il est désactivé ou inconnu. */
  readonly autoCompactAt: number | null
}

export interface ContextGauge {
  readonly tokens: number
  /** `null` si la taille de la fenêtre est inconnue, ou plus petite que le contexte observé (mode 1 M non détecté). */
  readonly window: number | null
  readonly percent: number | null
  readonly level: GaugeLevel
  readonly autoCompactAt: number | null
}

export function contextGauge(tokens: number, limits: ContextLimits | null): ContextGauge {
  if (limits === null || limits.window <= 0 || tokens > limits.window) {
    return { tokens, window: null, percent: null, level: 'normal', autoCompactAt: null }
  }
  const percent = Math.round((tokens / limits.window) * 100)
  return { tokens, window: limits.window, percent, level: levelOf(percent), autoCompactAt: limits.autoCompactAt }
}

/**
 * Limites d'un modèle quand une session en direct rapporte une fenêtre différente de celle de la sonde
 * (mode 1 M par exemple) : la réserve du compactage automatique est conservée.
 */
export function withWindow(limits: ContextLimits | null, window: number): ContextLimits {
  if (limits === null || limits.autoCompactAt === null) return { window, autoCompactAt: null }
  return { window, autoCompactAt: Math.max(0, window - (limits.window - limits.autoCompactAt)) }
}

/** Catégories du contexte reconnues ; une catégorie inconnue garde le libellé du fournisseur. */
export const contextCategories = [
  'system-prompt',
  'system-tools',
  'mcp-tools',
  'mcp-instructions',
  'agents',
  'memory',
  'skills',
  'messages',
  'buffer',
  'free',
  'other',
] as const
export type ContextCategoryId = (typeof contextCategories)[number]

export interface ContextCategory {
  readonly id: ContextCategoryId
  /** Libellé du fournisseur, affiché pour une catégorie `other`. */
  readonly label: string
  readonly tokens: number
}

/** Découpage du contexte d'une session en direct, au moment de la demande. */
export interface ContextBreakdown {
  readonly model: string
  readonly totalTokens: number
  readonly window: number
  readonly autoCompactAt: number | null
  /** Catégories occupant la fenêtre, puis réserve et espace libre ; les schémas d'outils différés n'y sont pas. */
  readonly categories: readonly ContextCategory[]
  readonly memoryFiles: readonly { readonly path: string; readonly tokens: number }[]
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

/** Pourcentage borné et arrondi ; `undefined` pour une valeur absente ou invalide. */
export function normalizeUtilization(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(100, Math.max(0, Math.round(value)))
}
