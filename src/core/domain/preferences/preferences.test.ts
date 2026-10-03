import { describe, expect, it } from 'vitest'
import { defaultPreferences, restorePreferences, updatePreferences } from './preferences'

describe('restorePreferences', () => {
  it('reprend des préférences valides', () => {
    expect(
      restorePreferences({
        theme: 'light',
        language: 'en',
        editor: 'cursor',
        firstRunCompleted: true,
        notifications: false,
      }),
    ).toEqual({
      theme: 'light',
      language: 'en',
      editor: 'cursor',
      firstRunCompleted: true,
      notifications: false,
    })
  })

  it('remplace les valeurs absentes ou invalides par les valeurs par défaut', () => {
    expect(restorePreferences({})).toEqual(defaultPreferences)
    expect(restorePreferences({ theme: 'violet', language: 42, editor: 'vim', firstRunCompleted: 'oui' })).toEqual(
      defaultPreferences,
    )
  })
})

describe('updatePreferences', () => {
  it('ne modifie que les champs fournis', () => {
    expect(updatePreferences(defaultPreferences, { language: 'en', firstRunCompleted: true })).toEqual({
      ...defaultPreferences,
      language: 'en',
      firstRunCompleted: true,
    })
  })
})
