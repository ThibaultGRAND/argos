const EXCERPT_LENGTH = 200

/** Raccourcit un texte en une ligne, pour un titre ou un extrait. */
export function excerpt(text: string, maxLength = EXCERPT_LENGTH): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length <= maxLength ? singleLine : `${singleLine.slice(0, maxLength - 1).trimEnd()}…`
}

export interface TitleCandidates {
  readonly customTitle: string | null
  readonly generatedTitle: string | null
  readonly firstPrompt: string | null
}

/**
 * Titre affiché d'une session : titre personnalisé, sinon titre automatique, sinon début du premier message.
 * `null` signifie « session sans titre » : l'interface affiche le libellé traduit.
 */
export function resolveSessionTitle(candidates: TitleCandidates): string | null {
  for (const candidate of [candidates.customTitle, candidates.generatedTitle, candidates.firstPrompt]) {
    if (candidate !== null && candidate.trim() !== '') return excerpt(candidate, 120)
  }
  return null
}
