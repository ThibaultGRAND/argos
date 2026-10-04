import type { ProviderId } from '../history/provider'
import type { ReviewedFile } from '../review/reviewed-file'

/** Fichiers marqués relus, dans argos.db (données propres à Argos) : une marque par fichier et par session. */
export interface ReviewedFileRepository {
  listForSession(providerId: ProviderId, sessionExternalId: string): readonly ReviewedFile[]
  /** Enregistre la marque, en remplaçant celle d'une version précédente du même fichier. */
  save(file: ReviewedFile): void
  remove(providerId: ProviderId, sessionExternalId: string, filePath: string): void
}
