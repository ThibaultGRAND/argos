import type { ContextLimits, PlanQuota } from '../usage/usage'

/**
 * Lecture de l'usage auprès du fournisseur (F08, capacités `usage.context` et `usage.quota`),
 * sans rien consommer ni créer de session.
 */
export interface UsageProbe {
  /** Limites de contexte d'un modèle ; `null` si le fournisseur ne les donne pas. */
  contextLimits(model: string): Promise<ContextLimits | null>
  /** Limites de l'abonnement ; `null` si elles ne s'appliquent pas (clé API) ou sont indisponibles. */
  quota(): Promise<PlanQuota | null>
}
