import { describe, expect, it } from 'vitest'
import { defaultPreferences, restorePreferences, updatePreferences } from './preferences'

describe('restorePreferences', () => {
  it('reprend des préférences valides', () => {
    expect(restorePreferences({ theme: 'light', language: 'en' })).toEqual({ theme: 'light', language: 'en' })
  })

  it('remplace les valeurs absentes ou invalides par les valeurs par défaut', () => {
    expect(restorePreferences({})).toEqual(defaultPreferences)
    expect(restorePreferences({ theme: 'violet', language: 42 })).toEqual(defaultPreferences)
  })
})

describe('updatePreferences', () => {
  it('ne modifie que les champs fournis', () => {
    expect(updatePreferences(defaultPreferences, { language: 'en' })).toEqual({ theme: 'dark', language: 'en' })
  })
})
