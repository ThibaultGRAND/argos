import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openArgosDatabase } from './argos-database'
import { SqlitePreferencesRepository } from './preferences-repository'
import { SqliteReviewedFileRepository } from './reviewed-file-repository'

const migrationsFolder = resolve(__dirname, 'migrations')

describe('argos.db', () => {
  let directory: string

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'argos-test-'))
  })

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
  })

  const open = () =>
    openArgosDatabase({
      path: join(directory, 'argos.db'),
      migrationsFolder,
      backupDirectory: join(directory, 'backups'),
    })

  it('garde une seule marque « relu » par fichier, remplacée à chaque nouvelle version', () => {
    const handle = open()
    const repository = new SqliteReviewedFileRepository(handle.database)
    const mark = (id: string, filePath: string, blob: string) =>
      repository.save({
        id,
        providerId: 'claude',
        sessionExternalId: 's',
        filePath,
        blob,
        reviewedAt: '2026-10-04T12:00:00.000Z',
      })
    mark('1', 'a.ts', 'v1')
    mark('2', 'a.ts', 'v2')
    mark('3', 'b.ts', 'v1')
    expect(repository.listForSession('claude', 's').map((file) => [file.filePath, file.blob])).toEqual([
      ['a.ts', 'v2'],
      ['b.ts', 'v1'],
    ])
    repository.remove('claude', 's', 'a.ts')
    expect(repository.listForSession('claude', 's').map((file) => file.filePath)).toEqual(['b.ts'])
    handle.close()
  })

  it('renvoie les préférences par défaut sur une base neuve', async () => {
    const handle = open()
    const repository = new SqlitePreferencesRepository(handle.database)
    expect(await repository.load()).toEqual({
      theme: 'dark',
      language: 'fr',
      editor: 'vscode',
      firstRunCompleted: false,
      notifications: true,
      updates: true,
    })
    handle.close()
  })

  it('conserve les préférences enregistrées après réouverture', async () => {
    const first = open()
    await new SqlitePreferencesRepository(first.database).save({
      theme: 'light',
      language: 'en',
      editor: 'cursor',
      firstRunCompleted: true,
      notifications: false,
      updates: false,
    })
    first.close()

    const second = open()
    expect(await new SqlitePreferencesRepository(second.database).load()).toEqual({
      theme: 'light',
      language: 'en',
      editor: 'cursor',
      firstRunCompleted: true,
      notifications: false,
      updates: false,
    })
    second.close()
  })

  it('ne fait pas de copie de sauvegarde pour une base neuve ni sans migration en attente', () => {
    open().close()
    open().close()
    expect(() => readdirSync(join(directory, 'backups'))).toThrow()
  })
})
