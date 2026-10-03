import { describe, expect, it } from 'vitest'
import { nextOrdinal } from './snapshot'

describe('nextOrdinal', () => {
  it('commence à S0 puis continue après le plus grand numéro', () => {
    expect(nextOrdinal([])).toBe(0)
    expect(nextOrdinal([{ ordinal: 0 }, { ordinal: 2 }, { ordinal: 1 }])).toBe(3)
  })
})
