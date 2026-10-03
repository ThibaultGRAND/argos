import { describe, expect, it } from 'vitest'
import { excerpt, resolveSessionTitle } from './session-title'

describe('resolveSessionTitle', () => {
  it('préfère le titre personnalisé, puis le titre automatique, puis le premier message', () => {
    expect(resolveSessionTitle({ customTitle: 'Perso', generatedTitle: 'Auto', firstPrompt: 'Prompt' })).toBe('Perso')
    expect(resolveSessionTitle({ customTitle: null, generatedTitle: 'Auto', firstPrompt: 'Prompt' })).toBe('Auto')
    expect(resolveSessionTitle({ customTitle: '  ', generatedTitle: null, firstPrompt: 'Prompt' })).toBe('Prompt')
  })

  it('renvoie null pour une session sans aucun titre', () => {
    expect(resolveSessionTitle({ customTitle: null, generatedTitle: null, firstPrompt: null })).toBeNull()
  })
})

describe('excerpt', () => {
  it('met le texte sur une ligne et le raccourcit', () => {
    expect(excerpt('a\n\n  b')).toBe('a b')
    expect(excerpt('abcdefghij', 5)).toBe('abcd…')
  })
})
