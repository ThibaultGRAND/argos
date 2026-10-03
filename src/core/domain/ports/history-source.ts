import type { ReadChunk, SourceFile } from '../history/history-source'
import type { ProviderId } from '../history/provider'

/** Lecture de l'historique local d'une CLI (PLAN.md §2.2). */
export interface HistorySource {
  readonly providerId: ProviderId
  /** Version du lecteur : la changer force la réimportation des sessions de ce fournisseur. */
  readonly parserVersion: number
  discover(): Promise<readonly SourceFile[]>
  readChunk(file: SourceFile, fromOffset: number): Promise<ReadChunk>
}
