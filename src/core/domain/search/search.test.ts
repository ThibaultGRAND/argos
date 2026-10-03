import { describe, expect, it } from 'vitest'
import { normalizeSearchText, periodStart } from './search'

describe('normalizeSearchText', () => {
  it('nettoie les espaces et refuse les saisies trop courtes', () => {
    expect(normalizeSearchText('  slug   astro ')).toBe('slug astro')
    expect(normalizeSearchText('a')).toBeUndefined()
    expect(normalizeSearchText('   ')).toBeUndefined()
  })

  it('limite la longueur', () => {
    expect(normalizeSearchText('x'.repeat(500))).toHaveLength(200)
  })
})

describe('periodStart', () => {
  const now = new Date('2026-10-10T12:00:00.000Z')
  it('renvoie le début de la période', () => {
    expect(periodStart('all', now)).toBeUndefined()
    expect(periodStart('week', now)).toBe('2026-10-03T12:00:00.000Z')
  })
})

describe('marqueurs de surlignage', () => {
  it('sont identiques dans le domaine et dans le contrat IPC', async () => {
    const contract = await import('../../../shared/contract/search')
    const domain = await import('./search')
    expect([contract.HIGHLIGHT_START, contract.HIGHLIGHT_END]).toEqual([domain.HIGHLIGHT_START, domain.HIGHLIGHT_END])
  })
})
