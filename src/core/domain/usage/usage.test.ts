import { describe, expect, it } from 'vitest'
import { contextGauge, contextTokensOf, normalizeUtilization } from './usage'

describe('usage', () => {
  it('compte le contexte occupé après un appel', () => {
    expect(
      contextTokensOf({ inputTokens: 2, cacheReadTokens: 126_674, cacheCreationTokens: 3_276, outputTokens: 183 }),
    ).toBe(130_135)
  })

  it('calcule le pourcentage et le seuil d’alerte', () => {
    expect(contextGauge(130_000, 1_000_000)).toEqual({
      tokens: 130_000,
      window: 1_000_000,
      percent: 13,
      warning: false,
    })
    expect(contextGauge(170_000, 200_000).warning).toBe(true)
  })

  it('ignore une fenêtre inconnue ou plus petite que le contexte observé', () => {
    expect(contextGauge(300_000, 200_000)).toEqual({ tokens: 300_000, window: null, percent: null, warning: false })
    expect(contextGauge(10, null).percent).toBeNull()
  })

  it('borne les pourcentages de quota', () => {
    expect(normalizeUtilization(16.4)).toBe(16)
    expect(normalizeUtilization(130)).toBe(100)
    expect(normalizeUtilization(null)).toBeUndefined()
  })
})
