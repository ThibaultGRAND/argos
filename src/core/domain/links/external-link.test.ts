import { describe, expect, it } from 'vitest'
import { isSafeExternalUrl } from './external-link'

describe('isSafeExternalUrl', () => {
  it('accepte le web et les e-mails', () => {
    expect(isSafeExternalUrl('https://claude.ai')).toBe(true)
    expect(isSafeExternalUrl('http://localhost:3000')).toBe(true)
    expect(isSafeExternalUrl('mailto:a@b.fr')).toBe(true)
  })

  it('refuse les fichiers, les programmes et les adresses invalides', () => {
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('vscode://file/a')).toBe(false)
    expect(isSafeExternalUrl('pas une adresse')).toBe(false)
  })
})
