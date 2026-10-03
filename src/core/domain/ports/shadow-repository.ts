import type { CommitStats } from '../snapshots/snapshot'

export interface ShadowCommit {
  readonly commitHash: string
  readonly parentCommitHash: string | null
  /** Changements par rapport au commit précédent du dépôt fantôme. */
  readonly stats: CommitStats
}

/** Dépôt git fantôme d'un projet (PLAN.md §2.4) : capture et restauration des fichiers, sans toucher au `.git` du projet. */
export interface ShadowRepository {
  isAvailable(): Promise<boolean>
  snapshot(projectPath: string, message: string): Promise<ShadowCommit>
  /** Remet les fichiers du projet dans l'état du commit (modifiés, créés et supprimés depuis). */
  restore(projectPath: string, commitHash: string): Promise<void>
}
