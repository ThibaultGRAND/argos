import type { HistoryEvent } from '../history/events'
import type { ImportCursor, SourceFile } from '../history/history-source'
import type { ProviderId } from '../history/provider'

export interface ApplyResult {
  /** Vrai si la session a été créée ou modifiée. */
  readonly sessionChanged: boolean
  /** Événements ignorés faute de session connue (aucun `cwd` encore rencontré). */
  readonly orphanEvents: number
}

/** Écriture de l'index (index.db), réservée à l'indexeur (PLAN.md §2.4). */
export interface HistoryIndex {
  cursors(providerId: ProviderId): ReadonlyMap<string, ImportCursor>
  /** Supprime la session et la position d'un fichier, avant une réimportation complète. */
  resetSource(file: SourceFile): void
  /** Vide tout l'index (sessions, messages, positions de lecture) avant une reconstruction complète. */
  clear(): void
  /** Applique les événements d'un bloc et enregistre la nouvelle position, dans une même transaction. */
  applyChunk(file: SourceFile, events: readonly HistoryEvent[], cursor: ImportCursor): ApplyResult
}
