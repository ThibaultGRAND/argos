import { describe, expect, it } from 'vitest'
import { HIGHLIGHT_END, HIGHLIGHT_START } from '@shared/contract'
import { splitSnippet } from './highlight'

describe('splitSnippet', () => {
  it('sépare les passages surlignés', () => {
    expect(splitSnippet(`le ${HIGHLIGHT_START}slug${HIGHLIGHT_END} est\nfaux`)).toEqual([
      { text: 'le ', highlighted: false },
      { text: 'slug', highlighted: true },
      { text: ' est faux', highlighted: false },
    ])
  })

  it('tolère un marqueur de fin manquant', () => {
    expect(splitSnippet(`${HIGHLIGHT_START}abc`)).toEqual([{ text: 'abc', highlighted: true }])
  })
})
