import { describe, expect, it } from 'vitest'
import { defaultPreferences } from '../../domain/preferences/preferences'
import type { ReviewCommentRepository } from '../../domain/ports/review-comment-repository'
import type { ShadowRepository } from '../../domain/ports/shadow-repository'
import type { SnapshotRepository } from '../../domain/ports/snapshot-repository'
import type { ReviewComment } from '../../domain/review/review-comment'
import type { Snapshot } from '../../domain/snapshots/snapshot'
import { ChangeAttribution } from '../snapshots/change-attribution'
import type { ReviewedFileRepository } from '../../domain/ports/reviewed-file-repository'
import type { ReviewedFile } from '../../domain/review/reviewed-file'
import { ReviewService } from './review-service'

const snapshot = (id: string, ordinal: number): Snapshot => ({
  id,
  projectPath: '/p',
  providerId: 'claude',
  sessionExternalId: 's',
  ordinal,
  kind: ordinal === 0 ? 'baseline' : 'turn',
  commitHash: `c${ordinal}`,
  parentCommitHash: null,
  filesChanged: 1,
  linesAdded: 1,
  linesRemoved: 0,
  label: null,
  reviewedAt: null,
  createdAt: '2026-10-03T12:00:00.000Z',
})

const fileDiff = (path: string, blob: string | null = `${path}-v1`) => ({
  path,
  oldPath: null,
  blob,
  status: 'modified' as const,
  binary: false,
  additions: 1,
  deletions: 0,
  hunks: [],
  truncated: false,
})

function setup(snapshots: Snapshot[]) {
  const diffs: [string, string][] = []
  const sent: string[] = []
  const rows: ReviewComment[] = []
  const shadow: ShadowRepository = {
    isAvailable: async () => true,
    snapshot: async () => ({
      commitHash: '',
      parentCommitHash: null,
      stats: { filesChanged: 0, linesAdded: 0, linesRemoved: 0 },
    }),
    restore: async () => undefined,
    restoreFiles: async () => undefined,
    changedPaths: async (_project, from, to) => (from === 'c1' && to === 'c2' ? ['notes.md'] : ['a.ts']),
    changesSince: async () => ({ files: [], truncated: false }),
    diff: async (_project, from, to) => {
      diffs.push([from, to])
      return { files: [fileDiff('a.ts'), fileDiff('notes.md')], truncated: false }
    },
  }
  const reviewed: string[] = []
  const snapshotRepository: SnapshotRepository = {
    save: () => undefined,
    listForSession: () => snapshots,
    get: (id) => snapshots.find((candidate) => candidate.id === id),
    markReviewed: (id) => void reviewed.push(id),
  }
  const comments: ReviewCommentRepository = {
    save: (comment) => void rows.push(comment),
    listForSession: () => rows,
    delete: (id) =>
      void rows.splice(
        rows.findIndex((row) => row.id === id),
        1,
      ),
    markSent: (ids, at) => {
      for (const [index, row] of rows.entries()) if (ids.includes(row.id)) rows[index] = { ...row, sentAt: at }
    },
  }
  const marks: ReviewedFile[] = []
  const reviewedFiles: ReviewedFileRepository = {
    listForSession: () => marks,
    save: (file) => {
      const index = marks.findIndex((mark) => mark.filePath === file.filePath)
      if (index === -1) marks.push(file)
      else marks[index] = file
    },
    remove: (_provider, _session, path) =>
      void marks.splice(
        marks.findIndex((mark) => mark.filePath === path),
        1,
      ),
  }
  let id = 0
  const service = new ReviewService({
    reviewedFiles,
    shadow,
    attribution: new ChangeAttribution(shadow),
    snapshots: snapshotRepository,
    comments,
    preferences: { load: async () => defaultPreferences, save: async () => undefined },
    sendToSession: async (_sessionId, text) => {
      sent.push(text)
      return 'run-1'
    },
    newId: () => `id-${++id}`,
    now: () => new Date('2026-10-03T13:00:00.000Z'),
  })
  return { service, diffs, sent, rows, reviewed }
}

const newComment = {
  sessionExternalId: 's',
  snapshotId: 'b',
  filePath: 'a.ts',
  line: 3,
  side: 'new' as const,
  excerpt: 'x',
}

describe('ReviewService', () => {
  it('compare toute la session par défaut, ou un seul tour', async () => {
    const { service, diffs } = setup([snapshot('a', 0), snapshot('b', 1), snapshot('c', 2)])
    const all = await service.diff('s')
    expect([all.from?.id, all.turns.map((turn) => turn.snapshot.id)]).toEqual(['a', ['b', 'c']])
    await service.diff('s', { kind: 'turn', snapshotId: 'c' })
    expect(diffs).toEqual([
      ['c0', 'c2'],
      ['c1', 'c2'],
    ])
  })

  it('montre ce qui a changé depuis la dernière review', async () => {
    const { service } = setup([
      snapshot('a', 0),
      { ...snapshot('b', 1), reviewedAt: '2026-10-03T12:30:00.000Z' },
      snapshot('c', 2),
    ])
    const diff = await service.diff('s', { kind: 'since-review' })
    expect([diff.sinceReviewAvailable, diff.from?.id, diff.to?.id]).toEqual([true, 'b', 'c'])
  })

  it('marque une capture comme relue et refuse une capture inconnue', () => {
    const { service, reviewed } = setup([snapshot('a', 0)])
    service.markReviewed('a')
    expect(reviewed).toEqual(['a'])
    expect(() => service.markReviewed('z')).toThrow()
  })

  it('s’arrête par défaut au dernier snapshot de fin de tour, pas à un « avant retour »', async () => {
    const { service } = setup([snapshot('a', 0), snapshot('b', 1), { ...snapshot('c', 2), kind: 'before_restore' }])
    expect((await service.diff('s')).to?.id).toBe('b')
  })

  it('sépare le travail de l’agent des modifications faites entre ses tours', async () => {
    const { service } = setup([
      snapshot('a', 0),
      snapshot('b', 1),
      { ...snapshot('p', 2), kind: 'prompt' },
      snapshot('c', 3),
    ])
    const diff = await service.diff('s')
    expect(diff.files.map((entry) => entry.file.path)).toEqual(['a.ts'])
    expect(diff.otherFiles.map((file) => file.path)).toEqual(['notes.md'])
  })

  it('marque un fichier relu pour sa version, puis le démarque', async () => {
    const { service } = setup([snapshot('a', 0), snapshot('b', 1)])
    service.markFileReviewed('s', 'a.ts', 'a.ts-v1')
    expect((await service.diff('s')).files.map((entry) => [entry.file.path, entry.reviewed])).toEqual([['a.ts', true]])
    service.markFileReviewed('s', 'a.ts', 'a.ts-v0')
    expect((await service.diff('s')).files[0]?.reviewed).toBe(false)
    service.unmarkFileReviewed('s', 'a.ts')
    expect((await service.diff('s')).files[0]?.reviewed).toBe(false)
  })

  it('ne compare rien sans au moins deux snapshots', async () => {
    const { service, diffs } = setup([snapshot('a', 0)])
    expect((await service.diff('s')).files).toEqual([])
    expect(diffs).toEqual([])
  })

  it('enregistre les commentaires, refuse un commentaire vide, puis envoie seulement ceux pas encore envoyés', async () => {
    const { service, sent, rows, reviewed } = setup([snapshot('a', 0), snapshot('b', 1)])
    expect(() => service.addComment({ ...newComment, body: '   ' })).toThrow()
    service.addComment({ ...newComment, body: 'Ajoute un test' })
    const result = await service.send(42, 's')
    expect(result).toEqual({ runId: 'run-1', sent: 1 })
    expect(sent[0]).toContain('Remarque : Ajoute un test')
    expect(rows[0]?.sentAt).toBe('2026-10-03T13:00:00.000Z')
    expect(reviewed).toEqual(['b'])
    await expect(service.send(42, 's')).rejects.toMatchObject({ code: 'no_comment_to_send' })
  })
})
