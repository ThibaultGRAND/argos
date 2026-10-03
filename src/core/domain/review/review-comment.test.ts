import { describe, expect, it } from 'vitest'
import { formatReviewMessage, type ReviewComment } from './review-comment'

const comment = (filePath: string, line: number, body: string, side: 'new' | 'old' = 'new'): ReviewComment => ({
  id: `${filePath}:${line}`,
  providerId: 'claude',
  sessionExternalId: 's',
  snapshotId: 'snap',
  filePath,
  line,
  side,
  excerpt: '  const x = 1  ',
  body,
  sentAt: null,
  createdAt: '2026-10-03T12:00:00.000Z',
})

describe('formatReviewMessage', () => {
  it('liste les remarques triées par fichier puis par ligne, avec l’extrait', () => {
    const message = formatReviewMessage(
      [
        comment('src/b.ts', 3, 'Renomme'),
        comment('src/a.ts', 9, 'Ajoute un test'),
        comment('src/a.ts', 2, 'Inutile', 'old'),
      ],
      'fr',
    )
    expect(message).toBe(
      [
        'Voici ma relecture de tes modifications. Traite chaque remarque, puis résume ce que tu as changé :',
        '',
        '1. `src/a.ts`, ligne 2 (version précédente) :\n   > const x = 1\n   Remarque : Inutile',
        '',
        '2. `src/a.ts`, ligne 9 :\n   > const x = 1\n   Remarque : Ajoute un test',
        '',
        '3. `src/b.ts`, ligne 3 :\n   > const x = 1\n   Remarque : Renomme',
      ].join('\n'),
    )
  })

  it('suit la langue choisie', () => {
    expect(formatReviewMessage([comment('a.ts', 1, 'Fix')], 'en')).toContain('`a.ts`, line 1 :')
  })
})
