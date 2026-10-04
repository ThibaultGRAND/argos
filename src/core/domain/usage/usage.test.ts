import { describe, expect, it } from 'vitest'
import { contextGauge, contextTokensOf, levelOf, normalizeUtilization, withWindow } from './usage'

describe('usage', () => {
  it('compte le contexte occupé après un appel', () => {
    expect(
      contextTokensOf({ inputTokens: 2, cacheReadTokens: 126_674, cacheCreationTokens: 3_276, outputTokens: 183 }),
    ).toBe(130_135)
  })

  it('passe en vigilance à 50 % et en alerte à 80 %', () => {
    expect([levelOf(49), levelOf(50), levelOf(79), levelOf(80)]).toEqual(['normal', 'caution', 'caution', 'warning'])
  })

  it('calcule le pourcentage, le niveau et le seuil de compactage', () => {
    expect(contextGauge(130_000, { window: 1_000_000, autoCompactAt: 967_000 })).toEqual({
      tokens: 130_000,
      window: 1_000_000,
      percent: 13,
      level: 'normal',
      autoCompactAt: 967_000,
    })
    expect(contextGauge(170_000, { window: 200_000, autoCompactAt: 167_000 }).level).toBe('warning')
    expect(contextGauge(110_000, { window: 200_000, autoCompactAt: null }).level).toBe('caution')
  })

  it('ignore une fenêtre inconnue ou plus petite que le contexte observé', () => {
    expect(contextGauge(300_000, { window: 200_000, autoCompactAt: 167_000 })).toEqual({
      tokens: 300_000,
      window: null,
      percent: null,
      level: 'normal',
      autoCompactAt: null,
    })
    expect(contextGauge(10, null).percent).toBeNull()
  })

  it('garde la réserve de compactage quand la fenêtre change', () => {
    expect(withWindow({ window: 200_000, autoCompactAt: 167_000 }, 1_000_000)).toEqual({
      window: 1_000_000,
      autoCompactAt: 967_000,
    })
    expect(withWindow(null, 200_000)).toEqual({ window: 200_000, autoCompactAt: null })
  })

  it('borne les pourcentages de quota', () => {
    expect(normalizeUtilization(16.4)).toBe(16)
    expect(normalizeUtilization(130)).toBe(100)
    expect(normalizeUtilization(null)).toBeUndefined()
  })
})
