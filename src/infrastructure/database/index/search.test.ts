import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ImportHistory } from '../../../core/application/history/import-history'
import { SearchHistory } from '../../../core/application/search/search-history'
import { HIGHLIGHT_END, HIGHLIGHT_START } from '../../../core/domain/search/search'
import { ClaudeHistorySource } from '../../providers/claude/claude-history-source'
import { SqliteHistoryIndex } from './history-index-repository'
import { openIndexDatabase, type IndexDatabaseHandle } from './index-database'
import { SqliteSearchQueries, toFtsQuery } from './search-repository'

const fixture = resolve(__dirname, '../../../../tests/fixtures/claude/2.1.284/session-basique.jsonl')
const migrationsFolder = resolve(__dirname, 'migrations')

describe('toFtsQuery', () => {
  it('protège chaque mot et cherche le dernier comme début de mot', () => {
    expect(toFtsQuery('slug astro')).toBe('"slug" "astro"*')
    expect(toFtsQuery('a"b OR (c)*')).toBe('"ab" "OR" "(c)*"*')
    expect(toFtsQuery('   ')).toBeUndefined()
  })
})

describe('recherche plein texte dans index.db', () => {
  let directory: string
  let sessionFile: string
  let handle: IndexDatabaseHandle

  const appendAssistant = (text: string, timestamp: string) =>
    appendFileSync(
      sessionFile,
      `${JSON.stringify({ type: 'assistant', uuid: `a-${timestamp}`, cwd: '/projets/site-esf', timestamp, message: { model: 'claude-opus-5-5', content: [{ type: 'text', text }] } })}\n`,
    )

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'argos-search-'))
    mkdirSync(join(directory, 'projects', '-projets-site-esf'), { recursive: true })
    sessionFile = join(directory, 'projects', '-projets-site-esf', 's-1.jsonl')
    copyFileSync(fixture, sessionFile)
    handle = openIndexDatabase(join(directory, 'index.db'), migrationsFolder)
  })

  afterEach(() => {
    handle.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const importAll = () =>
    new ImportHistory(
      [new ClaudeHistorySource(join(directory, 'projects'))],
      new SqliteHistoryIndex(handle.database),
    ).execute()
  const search = (query: string, extra: { projectId?: number; period?: 'all' | 'week' } = {}) =>
    new SearchHistory(new SqliteSearchQueries(handle.database), () => new Date('2026-10-02T00:00:00.000Z')).execute({
      query,
      ...extra,
    })

  it('trouve un message, surligne les mots et donne sa position', async () => {
    await importAll()
    const { messages } = search('slugify')
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      role: 'assistant',
      projectName: 'site-esf',
      sessionTitle: '404 cours collectifs',
    })
    expect(messages[0]?.snippet).toContain(`${HIGHLIGHT_START}slugify${HIGHLIGHT_END}`)
    expect(typeof messages[0]?.seq).toBe('number')
  })

  it('ignore la casse et les accents, et cherche le dernier mot comme un début de mot', async () => {
    appendAssistant('Un événement Déployé avec succès.', '2026-10-01T16:00:00.000Z')
    await importAll()
    expect(search('EVENEMENT deploy').messages).toHaveLength(1)
  })

  it('trouve les sessions par titre', async () => {
    await importAll()
    expect(search('collectifs').sessions).toHaveLength(1)
  })

  it('applique les filtres de période et de projet', async () => {
    await importAll()
    expect(search('slugify', { period: 'week' }).messages).toHaveLength(1)
    expect(search('slugify', { projectId: 999 }).messages).toHaveLength(0)
  })

  it('accepte les caractères spéciaux sans erreur', async () => {
    await importAll()
    for (const query of ['"', '(*', 'a AND -b', 'NEAR(x y)', "l'url", '100%']) {
      expect(() => search(query)).not.toThrow()
    }
  })

  it('reste cohérente après une réimportation complète et indexe les nouveaux messages', async () => {
    await importAll()
    const lines = readFileSync(fixture, 'utf8').split('\n').slice(0, 2).join('\n')
    writeFileSync(sessionFile, `${lines}\n`)
    await importAll()
    expect(search('slugify').messages).toHaveLength(0)

    appendAssistant('Nouvelle réponse sur slugify.', '2026-10-01T17:00:00.000Z')
    await importAll()
    expect(search('slugify').messages).toHaveLength(1)
  })
})
