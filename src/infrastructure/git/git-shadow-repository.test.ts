import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GitShadowRepository } from './git-shadow-repository'

describe('GitShadowRepository', () => {
  let root: string
  let project: string
  let repository: GitShadowRepository

  const write = (path: string, content: string) => {
    mkdirSync(join(project, path, '..'), { recursive: true })
    writeFileSync(join(project, path), content)
  }
  const read = (path: string) => readFileSync(join(project, path), 'utf8')

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'argos-shadow-'))
    project = join(root, 'projet')
    mkdirSync(project)
    repository = new GitShadowRepository({
      root: join(root, 'shadow-git'),
      environment: process.env,
      maxFileBytes: 1024,
    })
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('capture puis restaure exactement les fichiers modifiés, créés et supprimés', async () => {
    write('a.ts', 'version 1\n')
    write('src/b.ts', 'b\n')
    const first = await repository.snapshot(project, 'S0')
    expect(first.parentCommitHash).toBeNull()

    write('a.ts', 'version 2\nplus\n')
    rmSync(join(project, 'src/b.ts'))
    write('nouveau/c.ts', 'c\n')
    const second = await repository.snapshot(project, 'S1')
    expect(second.parentCommitHash).toBe(first.commitHash)
    expect(second.stats).toEqual({ filesChanged: 3, linesAdded: 3, linesRemoved: 2 })

    await repository.restore(project, first.commitHash)
    expect(read('a.ts')).toBe('version 1\n')
    expect(read('src/b.ts')).toBe('b\n')
    expect(existsSync(join(project, 'nouveau/c.ts'))).toBe(false)
  })

  it('peut annuler un retour en arrière grâce au snapshot pris juste avant', async () => {
    write('a.ts', '1\n')
    const before = await repository.snapshot(project, 'S0')
    write('a.ts', '2\n')
    write('b.ts', 'b\n')
    await repository.snapshot(project, 'S1')

    const safety = await repository.snapshot(project, 'avant retour')
    await repository.restore(project, before.commitHash)
    expect(read('a.ts')).toBe('1\n')

    await repository.snapshot(project, 'après retour')
    await repository.restore(project, safety.commitHash)
    expect(read('a.ts')).toBe('2\n')
    expect(read('b.ts')).toBe('b\n')
  })

  it('ne touche jamais au .git du projet et respecte ses exclusions', async () => {
    execFileSync('git', ['init', '--quiet'], { cwd: project })
    write('.gitignore', 'secret.env\n')
    write('secret.env', 'TOKEN=1\n')
    write('node_modules/lib/index.js', 'x\n')
    write('gros.bin', 'x'.repeat(4096))
    write('a.ts', 'a\n')
    const projectHead = readFileSync(join(project, '.git', 'HEAD'), 'utf8')

    const first = await repository.snapshot(project, 'S0')
    write('a.ts', 'modifié\n')
    write('secret.env', 'TOKEN=2\n')
    await repository.snapshot(project, 'S1')
    await repository.restore(project, first.commitHash)

    expect(read('a.ts')).toBe('a\n')
    // Fichiers ignorés, dépendances et gros fichiers : ni capturés, ni modifiés.
    expect(read('secret.env')).toBe('TOKEN=2\n')
    expect(existsSync(join(project, 'node_modules/lib/index.js'))).toBe(true)
    expect(existsSync(join(project, 'gros.bin'))).toBe(true)
    expect(first.stats.filesChanged).toBe(2) // .gitignore et a.ts
    expect(readFileSync(join(project, '.git', 'HEAD'), 'utf8')).toBe(projectHead)
    // Le dépôt du projet n'a reçu aucun commit d'Argos.
    expect(execFileSync('git', ['rev-list', '--all', '--count'], { cwd: project, encoding: 'utf8' }).trim()).toBe('0')
  })

  it('signale un dossier de projet introuvable', async () => {
    await expect(repository.snapshot(join(root, 'absent'), 'S0')).rejects.toMatchObject({ code: 'project_missing' })
  })
})
