import { describe, expect, it } from 'vitest'
import { loadShellEnvironment, parseEnvironment } from './shell-environment'

describe('parseEnvironment', () => {
  it('lit les variables après le marqueur, même si le shell affiche du texte avant', () => {
    expect(parseEnvironment('Bienvenue !\n__ARGOS_ENV_START__PATH=/a:/b\0HOME=/h\0EMPTY=\0')).toEqual({
      PATH: '/a:/b',
      HOME: '/h',
      EMPTY: '',
    })
    expect(parseEnvironment('pas de marqueur')).toEqual({})
  })
})

describe('loadShellEnvironment', () => {
  it('renvoie l’environnement tel quel sous Windows et en cas d’échec', async () => {
    expect(await loadShellEnvironment({ PATH: 'C:\\x' }, 'win32')).toEqual({ PATH: 'C:\\x' })
    expect(await loadShellEnvironment({ SHELL: '/introuvable', PATH: '/x' }, 'darwin')).toEqual({
      SHELL: '/introuvable',
      PATH: '/x',
    })
  })
})
