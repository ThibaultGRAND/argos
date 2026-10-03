import { describe, expect, it } from 'vitest'
import { buildEditorUrl } from './editors'

describe('buildEditorUrl', () => {
  it('construit le lien d’un fichier, avec la ligne', () => {
    expect(buildEditorUrl('vscode', '/Users/moi/projet/src/a.ts', 12)).toBe(
      'vscode://file/Users/moi/projet/src/a.ts:12',
    )
  })

  it('ouvre un dossier et suit l’éditeur choisi', () => {
    expect(buildEditorUrl('cursor', '/Users/moi/projet')).toBe('cursor://file/Users/moi/projet')
  })

  it('gère les chemins Windows et les caractères spéciaux', () => {
    expect(buildEditorUrl('vscode', 'C:\\Users\\moi\\Mon projet\\[...slug].astro')).toBe(
      'vscode://file/C:/Users/moi/Mon%20projet/%5B...slug%5D.astro',
    )
    expect(buildEditorUrl('vscode', '/a/#b?.ts')).toBe('vscode://file/a/%23b%3F.ts')
  })
})
