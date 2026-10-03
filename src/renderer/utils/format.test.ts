import { describe, expect, it } from 'vitest'
import { formatDuration, formatModel, formatWhen, relativeToProject, shortenPath } from './format'

describe('formatModel', () => {
  it('rend les modèles Claude lisibles', () => {
    expect(formatModel('claude-opus-5-5')).toBe('Opus 5.5')
    expect(formatModel('claude-opus-5')).toBe('Opus 5')
    expect(formatModel('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5')
    expect(formatModel('gpt-5')).toBe('gpt-5')
  })
})

describe('formatWhen', () => {
  const now = new Date(2026, 9, 3, 15, 0)
  it('affiche l’heure et le jour relatif pour aujourd’hui et hier', () => {
    expect(formatWhen(new Date(2026, 9, 3, 14, 2).toISOString(), 'fr', now)).toBe('14:02 · aujourd’hui')
    expect(formatWhen(new Date(2026, 9, 2, 9, 15).toISOString(), 'en', now)).toMatch(/^09:15.* · yesterday$/)
  })
  it('affiche la date au-delà', () => {
    expect(formatWhen(new Date(2026, 8, 28).toISOString(), 'fr', now)).toBe('28 sept.')
    expect(formatWhen(new Date(2025, 8, 28).toISOString(), 'fr', now)).toBe('28 sept. 2025')
  })
})

describe('shortenPath', () => {
  it('remplace le dossier personnel et tronque le début', () => {
    expect(shortenPath('/Users/thibault/dev/argos')).toBe('~/dev/argos')
    const short = shortenPath('/opt/un/chemin/vraiment/très/long/pour/tenir', 20)
    expect(short).toHaveLength(20)
    expect(short).toMatch(/^….*\/pour\/tenir$/)
  })
})

describe('formatDuration', () => {
  it('affiche des minutes puis des heures', () => {
    expect(formatDuration('2026-10-01T10:00:00Z', '2026-10-01T10:00:30Z')).toBe('< 1 min')
    expect(formatDuration('2026-10-01T10:00:00Z', '2026-10-01T10:18:00Z')).toBe('18 min')
    expect(formatDuration('2026-10-01T10:00:00Z', '2026-10-01T11:05:00Z')).toBe('1 h 05')
  })
})

describe('relativeToProject', () => {
  it('rend le chemin relatif au projet', () => {
    expect(relativeToProject('/p/site/src/a.ts', '/p/site')).toBe('src/a.ts')
    expect(relativeToProject('C:\\p\\site\\a.ts', 'C:\\p\\site')).toBe('a.ts')
    expect(relativeToProject('/ailleurs/b.ts', '/p/site')).toBe('/ailleurs/b.ts')
  })
})
