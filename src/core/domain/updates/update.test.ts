import { describe, expect, it } from 'vitest'
import { releasePageUrl, updateModeFor } from './update'

describe('mises à jour', () => {
  it('installe automatiquement seulement sur Windows et avec l’AppImage', () => {
    expect(updateModeFor('win32', false)).toBe('automatic')
    expect(updateModeFor('linux', true)).toBe('automatic')
    expect(updateModeFor('linux', false)).toBe('manual')
    expect(updateModeFor('darwin', false)).toBe('manual')
  })

  it('donne la page GitHub d’une version', () => {
    expect(releasePageUrl('https://github.com/ThibaultGRAND/argos/', '0.2.0')).toBe(
      'https://github.com/ThibaultGRAND/argos/releases/tag/v0.2.0',
    )
  })
})
