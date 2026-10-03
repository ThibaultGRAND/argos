import { describe, expect, it } from 'vitest'
import { DomainError } from '../../domain/errors'
import { defaultPreferences } from '../../domain/preferences/preferences'
import type { SessionQueries } from '../../domain/ports/session-queries'
import { OpenInEditor } from './open-in-editor'

const queries = (known: string[]): SessionQueries => ({
  listProjects: () => [],
  listSessions: () => [],
  getSession: () => undefined,
  listSessionFiles: () => [],
  listEntries: () => [],
  isKnownPath: (path) => known.includes(path),
  countSessions: () => 0,
})

function setup(known: string[], existing: string[]) {
  const opened: string[] = []
  const useCase = new OpenInEditor(
    { load: async () => ({ ...defaultPreferences, editor: 'cursor' }), save: async () => undefined },
    queries(known),
    { exists: (path) => existing.includes(path) },
    { open: async (url) => void opened.push(url) },
  )
  return { useCase, opened }
}

describe('OpenInEditor', () => {
  it('ouvre un chemin connu dans l’éditeur choisi', async () => {
    const { useCase, opened } = setup(['/p/a.ts'], ['/p/a.ts'])
    await useCase.execute('/p/a.ts', 3)
    expect(opened).toEqual(['cursor://file/p/a.ts:3'])
  })

  it('refuse un chemin inconnu et signale un fichier absent', async () => {
    const unknown = setup([], ['/etc/passwd'])
    await expect(unknown.useCase.execute('/etc/passwd')).rejects.toMatchObject({ code: 'unknown_path' })
    const missing = setup(['/p/b.ts'], [])
    await expect(missing.useCase.execute('/p/b.ts')).rejects.toBeInstanceOf(DomainError)
    expect(missing.opened).toEqual([])
  })
})
