import type { ProviderId } from '../history/provider'
import type { Language } from '../preferences/preferences'

/** Commentaire de review sur une ligne d'un fichier (F07). `side` : ligne de la nouvelle ou de l'ancienne version. */
export type CommentSide = 'new' | 'old'

export interface ReviewComment {
  readonly id: string
  readonly providerId: ProviderId
  readonly sessionExternalId: string
  /** Snapshot « À » affiché au moment du commentaire. */
  readonly snapshotId: string
  readonly filePath: string
  readonly line: number
  readonly side: CommentSide
  /** Ligne commentée, pour que l'agent sache de quoi on parle. */
  readonly excerpt: string
  readonly body: string
  readonly sentAt: string | null
  readonly createdAt: string
}

const texts = {
  fr: {
    intro: 'Voici ma relecture de tes modifications. Traite chaque remarque, puis résume ce que tu as changé :',
    line: (path: string, line: number, side: CommentSide) =>
      `\`${path}\`, ligne ${line}${side === 'old' ? ' (version précédente)' : ''}`,
    remark: 'Remarque',
  },
  en: {
    intro: 'Here is my review of your changes. Address each comment, then summarise what you changed:',
    line: (path: string, line: number, side: CommentSide) =>
      `\`${path}\`, line ${line}${side === 'old' ? ' (previous version)' : ''}`,
    remark: 'Comment',
  },
} as const

/** Message envoyé à l'agent avec les commentaires, dans la langue de l'utilisateur, triés par fichier puis par ligne. */
export function formatReviewMessage(comments: readonly ReviewComment[], language: Language): string {
  const text = texts[language]
  const sorted = [...comments].sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line)
  const items = sorted.map((comment, index) => {
    const excerpt = comment.excerpt.trim() === '' ? '' : `\n   > ${comment.excerpt.trim()}`
    return `${index + 1}. ${text.line(comment.filePath, comment.line, comment.side)} :${excerpt}\n   ${text.remark} : ${comment.body.trim()}`
  })
  return `${text.intro}\n\n${items.join('\n\n')}`
}
