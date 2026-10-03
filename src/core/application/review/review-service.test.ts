import { describe, expect, it } from 'vitest'
import { defaultPreferences } from '../../domain/preferences/preferences'
import type { ReviewCommentRepository } from '../../domain/ports/review-comment-repository'
import type { ShadowRepository } from '../../domain/ports/shadow-repository'
import type { SnapshotRepository } from '../../domain/ports/snapshot-repository'
import type { ReviewComment } from '../../domain/review/review-comment'
import type { Snapshot } from '../../domain/snapshots/snapshot'
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
  filesChanged: 0,
  linesAdded: 0,
  linesRemoved: 0,
  createdAt: '2026-10-03T12:00:00.000Z',
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
    diff: async (_project, from, to) => {
      diffs.push([from, to])
      return { files: [], truncated: false }
    },
  }
  const snapshotRepository: SnapshotRepository = {
    save: () => undefined,
    listForSession: () => snapshots,
    get: () => undefined,
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
  let id = 0
  const service = new ReviewService({
    shadow,
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
  return { service, diffs, sent, rows }
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
  it('compare par défaut le premier et le dernier snapshot, ou les snapshots choisis', async () => {
    const { service, diffs } = setup([snapshot('a', 0), snapshot('b', 1), snapshot('c', 2)])
    expect((await service.diff('s')).from?.id).toBe('a')
    await service.diff('s', 'b', 'c')
    expect(diffs).toEqual([
      ['c0', 'c2'],
      ['c1', 'c2'],
    ])
  })

  it('s’arrête par défaut au dernier snapshot de fin de tour, pas à un « avant retour »', async () => {
    const { service } = setup([snapshot('a', 0), snapshot('b', 1), { ...snapshot('c', 2), kind: 'before_restore' }])
    expect((await service.diff('s')).to?.id).toBe('b')
  })

  it('ne compare rien sans au moins deux snapshots', async () => {
    const { service, diffs } = setup([snapshot('a', 0)])
    expect((await service.diff('s')).files).toEqual([])
    expect(diffs).toEqual([])
  })

  it('enregistre les commentaires, refuse un commentaire vide, puis envoie seulement ceux pas encore envoyés', async () => {
    const { service, sent, rows } = setup([])
    expect(() => service.addComment({ ...newComment, body: '   ' })).toThrow()
    service.addComment({ ...newComment, body: 'Ajoute un test' })
    const result = await service.send(42, 's')
    expect(result).toEqual({ runId: 'run-1', sent: 1 })
    expect(sent[0]).toContain('Remarque : Ajoute un test')
    expect(rows[0]?.sentAt).toBe('2026-10-03T13:00:00.000Z')
    await expect(service.send(42, 's')).rejects.toMatchObject({ code: 'no_comment_to_send' })
  })
})
