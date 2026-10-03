import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GetSessionDetail } from '../../../core/application/history/get-session-detail'
import { ImportHistory } from '../../../core/application/history/import-history'
import { ListSessionEntries } from '../../../core/application/history/list-session-entries'
import { ListSessions } from '../../../core/application/history/list-sessions'
import { ClaudeHistorySource } from '../../providers/claude/claude-history-source'
import { SqliteHistoryIndex } from './history-index-repository'
import { openIndexDatabase, type IndexDatabaseHandle } from './index-database'
import { SqliteSessionQueries } from './session-queries-repository'

const fixture = resolve(__dirname, '../../../../tests/fixtures/claude/2.1.284/session-basique.jsonl')
const migrationsFolder = resolve(__dirname, 'migrations')

describe('import de l’historique Claude dans index.db', () => {
  let directory: string
  let projectsDirectory: string
  let sessionFile: string
  let handle: IndexDatabaseHandle

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'argos-index-'))
    projectsDirectory = join(directory, 'projects')
    mkdirSync(join(projectsDirectory, '-projets-site-esf'), { recursive: true })
    sessionFile = join(projectsDirectory, '-projets-site-esf', 's-1.jsonl')
    copyFileSync(fixture, sessionFile)
    handle = openIndexDatabase(join(directory, 'index.db'), migrationsFolder)
  })

  afterEach(() => {
    handle.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const importer = () =>
    new ImportHistory([new ClaudeHistorySource(projectsDirectory)], new SqliteHistoryIndex(handle.database))
  const queries = () => new SqliteSessionQueries(handle.database)

  it('range la session dans son projet avec ses compteurs et son titre', async () => {
    const report = await importer().execute()
    expect(report.failures).toEqual([])

    const [project] = queries().listProjects()
    expect(project).toMatchObject({ name: 'site-esf', path: '/projets/site-esf', sessionCount: 1 })

    const [session] = new ListSessions(queries()).execute(project?.id ?? -1)
    expect(session).toMatchObject({
      externalId: 's-1',
      title: '404 cours collectifs',
      excerpt: 'Build OK, 148 pages. Je lance les tests sur slugify.',
      model: 'claude-opus-5-5',
      startedAt: '2026-10-01T14:02:00.000Z',
      lastActivityAt: '2026-10-01T14:20:01.000Z',
      messageCount: 3,
      filesChanged: 2,
      linesAdded: 4,
      linesRemoved: 1,
    })
  })

  it('ne crée aucun doublon et ne relit que la suite d’un fichier qui grandit', async () => {
    await importer().execute()
    expect((await importer().execute()).filesRead).toBe(0)

    appendFileSync(
      sessionFile,
      `${JSON.stringify({
        type: 'assistant',
        uuid: 'a9',
        cwd: '/projets/site-esf',
        timestamp: '2026-10-01T15:00:00.000Z',
        message: { model: 'claude-opus-5-5', content: [{ type: 'text', text: 'Tests verts.' }] },
      })}\n`,
    )
    const report = await importer().execute()
    expect(report.filesRead).toBe(1)

    const [project] = queries().listProjects()
    const [session] = new ListSessions(queries()).execute(project?.id ?? -1)
    expect(session).toMatchObject({
      messageCount: 4,
      excerpt: 'Tests verts.',
      lastActivityAt: '2026-10-01T15:00:00.000Z',
    })
  })

  it('réimporte entièrement un fichier réécrit plus court', async () => {
    await importer().execute()
    const lines = readFileSync(fixture, 'utf8').split('\n').slice(0, 2).join('\n')
    writeFileSync(sessionFile, `${lines}\n`)
    await importer().execute()

    const [project] = queries().listProjects()
    const [session] = new ListSessions(queries()).execute(project?.id ?? -1)
    expect(session).toMatchObject({ messageCount: 1, filesChanged: 0, linesAdded: 0 })
  })

  it('filtre les sessions par titre, sans tenir compte de la casse', async () => {
    await importer().execute()
    const [project] = queries().listProjects()
    expect(new ListSessions(queries()).execute(project?.id ?? -1, 'COURS')).toHaveLength(1)
    expect(new ListSessions(queries()).execute(project?.id ?? -1, 'introuvable')).toHaveLength(0)
    expect(new ListSessions(queries()).execute(project?.id ?? -1, '100%')).toHaveLength(0)
  })

  it('donne la fiche, les fichiers et les entrées dans l’ordre réel de la session', async () => {
    await importer().execute()
    const [project] = queries().listProjects()
    const [session] = new ListSessions(queries()).execute(project?.id ?? -1)
    const id = session?.id ?? -1

    const detail = new GetSessionDetail(queries()).execute(id)
    expect(detail).toMatchObject({
      projectName: 'site-esf',
      gitBranch: 'main',
      cliVersion: '2.1.284',
      toolCallCount: 4,
    })
    expect(detail.files).toEqual([
      { path: '/projets/site-esf/src/lib/slugs.test.ts', linesAdded: 2, linesRemoved: 0, changes: 1 },
      { path: '/projets/site-esf/src/lib/slugs.ts', linesAdded: 2, linesRemoved: 1, changes: 1 },
    ])

    const page = new ListSessionEntries(queries()).execute(id)
    expect(page.nextSeq).toBeNull()
    expect(page.entries.map((entry) => (entry.kind === 'message' ? entry.role : entry.toolName))).toEqual([
      'user',
      'Read',
      'Edit',
      'Bash',
      'Write',
      'assistant',
      'user',
    ])
    expect(page.entries.find((entry) => entry.kind === 'tool' && entry.toolName === 'Edit')).toMatchObject({
      linesAdded: 2,
      linesRemoved: 1,
      status: 'success',
    })

    const firstPage = new ListSessionEntries(queries()).execute(id, -1, 3)
    expect(firstPage.entries).toHaveLength(3)
    const secondPage = new ListSessionEntries(queries()).execute(id, firstPage.nextSeq ?? -1, 3)
    expect(secondPage.entries[0]?.seq).toBe((firstPage.nextSeq ?? -1) + 1)
  })
})
