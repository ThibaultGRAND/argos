import type { ProviderId } from '../history/provider'

/**
 * Snapshot des fichiers d'un projet, pris par Argos (F06) : `baseline` au démarrage d'une session,
 * `turn` à chaque fin de tour, `before_restore` juste avant un retour en arrière (pour pouvoir l'annuler).
 */
export type SnapshotKind = 'baseline' | 'turn' | 'before_restore'

export interface CommitStats {
  readonly filesChanged: number
  readonly linesAdded: number
  readonly linesRemoved: number
}

export interface Snapshot extends CommitStats {
  readonly id: string
  readonly projectPath: string
  readonly providerId: ProviderId
  readonly sessionExternalId: string
  /** Numéro affiché (S0, S1…), propre à chaque session. */
  readonly ordinal: number
  readonly kind: SnapshotKind
  readonly commitHash: string
  readonly parentCommitHash: string | null
  readonly createdAt: string
}

/** Numéro du prochain snapshot d'une session : S0 pour le premier. */
export function nextOrdinal(existing: readonly Pick<Snapshot, 'ordinal'>[]): number {
  return existing.reduce((highest, snapshot) => Math.max(highest, snapshot.ordinal + 1), 0)
}
