import type { ProviderId } from '../history/provider'
import type { FileDiff } from './diff'

/**
 * Fichier marqué « relu » dans la review (features/agent_changes.md, relecture par fichier).
 * Comme sur GitHub, la marque vaut pour une version du fichier : modifié à nouveau, il redevient à relire.
 */
export interface ReviewedFile {
  readonly id: string
  readonly providerId: ProviderId
  readonly sessionExternalId: string
  readonly filePath: string
  /** Version du contenu relu (identifiant git du blob ; vide si git ne l'a pas donnée). */
  readonly blob: string
  readonly reviewedAt: string
}

/** Version d'un fichier du diff, telle qu'elle est enregistrée quand on le marque relu. */
export const versionOf = (file: Pick<FileDiff, 'blob'>): string => file.blob ?? ''

/** Vrai si cette version du fichier a été marquée relue. */
export function isReviewed(file: Pick<FileDiff, 'path' | 'blob'>, reviewed: readonly ReviewedFile[]): boolean {
  return reviewed.some((entry) => entry.filePath === file.path && entry.blob === versionOf(file))
}
