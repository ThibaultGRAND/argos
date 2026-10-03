import type { HistoryEvent } from './events'
import type { ProviderId } from './provider'

/** Un fichier d'historique d'une session, tel que trouvé sur le disque. */
export interface SourceFile {
  readonly providerId: ProviderId
  readonly path: string
  readonly sessionExternalId: string
  readonly size: number
}

/** Résultat de la lecture d'un bloc d'un fichier d'historique. */
export interface ReadChunk {
  readonly events: readonly HistoryEvent[]
  /** Position (en octets) juste après la dernière ligne complète lue. */
  readonly nextOffset: number
  readonly reachedEnd: boolean
  /** Lignes illisibles ou de type inconnu, ignorées sans bloquer l'import. */
  readonly skippedLines: number
}

/** Position de lecture enregistrée pour un fichier. */
export interface ImportCursor {
  readonly sourcePath: string
  readonly byteOffset: number
  readonly fileSize: number
  readonly parserVersion: number
}

/** Décide comment reprendre la lecture d'un fichier à partir de la position enregistrée. */
export function planRead(
  file: SourceFile,
  cursor: ImportCursor | undefined,
  parserVersion: number,
): 'skip' | 'resume' | 'reimport' {
  if (cursor === undefined) return 'resume'
  if (cursor.parserVersion !== parserVersion || file.size < cursor.byteOffset) return 'reimport'
  if (file.size === cursor.byteOffset) return 'skip'
  return 'resume'
}
