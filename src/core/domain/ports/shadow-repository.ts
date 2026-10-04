import type { FileDiff } from '../review/diff'
import type { CommitStats } from '../snapshots/snapshot'

export interface ShadowCommit {
  readonly commitHash: string
  readonly parentCommitHash: string | null
  /** Changements par rapport au commit de comparaison (à défaut, le commit précédent du dépôt fantôme). */
  readonly stats: CommitStats
}

/** Dépôt git fantôme d'un projet (PLAN.md §2.4) : capture et restauration des fichiers, sans toucher au `.git` du projet. */
export interface ShadowRepository {
  isAvailable(): Promise<boolean>
  /** Capture l'état du projet ; `compareTo` : commit de référence des statistiques (dernière capture de la session). */
  snapshot(projectPath: string, message: string, compareTo?: string): Promise<ShadowCommit>
  /** Remet les fichiers du projet dans l'état du commit (modifiés, créés et supprimés depuis). */
  restore(projectPath: string, commitHash: string): Promise<void>
  /** Remet quelques fichiers dans l'état du commit ; un fichier absent du commit est supprimé. */
  restoreFiles(projectPath: string, commitHash: string, paths: readonly string[]): Promise<void>
  /** Chemins (relatifs au projet) modifiés entre deux commits, anciens chemins des renommages compris. */
  changedPaths(projectPath: string, fromCommit: string, toCommit: string): Promise<readonly string[]>
  /** Fichiers du projet qui diffèrent aujourd'hui d'un commit (panneau D. Modifications). */
  changesSince(projectPath: string, commitHash: string): Promise<{ files: FileDiff[]; truncated: boolean }>
  /** Différences entre deux commits du dépôt fantôme (F07). */
  diff(projectPath: string, fromCommit: string, toCommit: string): Promise<{ files: FileDiff[]; truncated: boolean }>
}
