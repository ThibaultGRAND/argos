import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findClaudeExecutable } from './claude-executable'

describe('findClaudeExecutable', () => {
  let home: string
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'argos-claude-'))
  })
  afterEach(() => rmSync(home, { recursive: true, force: true }))

  const install = (directory: string, name = 'claude'): string => {
    mkdirSync(directory, { recursive: true })
    const path = join(directory, name)
    writeFileSync(path, '')
    chmodSync(path, 0o755)
    return path
  }

  it('préfère la CLI trouvée dans le PATH', () => {
    const inPath = install(join(home, 'bin'))
    install(join(home, '.local', 'bin'))
    expect(findClaudeExecutable({ PATH: join(home, 'bin') }, 'darwin', home)).toBe(inPath)
  })

  it('cherche dans l’emplacement de l’installateur officiel quand le PATH ne la contient pas', () => {
    const official = install(join(home, '.local', 'bin'))
    expect(findClaudeExecutable({ PATH: '' }, 'darwin', home)).toBe(official)
  })

  it('renvoie undefined si la CLI est introuvable', () => {
    expect(findClaudeExecutable({ PATH: join(home, 'vide') }, 'linux', join(home, 'personne'))).toBeUndefined()
  })
})
