import { describe, expect, it } from 'vitest'
import type { ShadowCommit, ShadowRepository } from '../../domain/ports/shadow-repository'
import type { SnapshotRepository } from '../../domain/ports/snapshot-repository'
import type { FileDiff } from '../../domain/review/diff'
import type { Snapshot } from '../../domain/snapshots/snapshot'
import { ChangeAttribution } from './change-attribution'
import { SnapshotService } from './snapshot-service'

const file = (path: string): FileDiff => ({
  path,
  oldPath: null,
  status: 'modified',
  binary: false,
  additions: 1,
  deletions: 0,
  hunks: [],
  truncated: false,
})

/**
 * Dépôt fantôme simulé : l'état du projet est un ensemble de chemins modifiés depuis le dernier commit.
 * Chaque commit retient les chemins qu'il a changés.
 */
class FakeShadow implements ShadowRepository {
  commits = 0
  available = true
  /** Fichiers modifiés depuis le dernier commit. */
  dirty: string[] = []
  readonly changed = new Map<string, string[]>()
  readonly restored: string[] = []
  readonly restoredFiles: [string, readonly string[]][] = []
  async isAvailable(): Promise<boolean> {
    return this.available
  }
  async snapshot(): Promise<ShadowCommit> {
    this.commits += 1
    const hash = `c${this.commits}`
    this.changed.set(hash, this.dirty)
    const filesChanged = this.dirty.length
    this.dirty = []
    return {
      commitHash: hash,
      parentCommitHash: null,
      stats: { filesChanged, linesAdded: filesChanged, linesRemoved: 0 },
    }
  }
  async restore(_projectPath: string, commitHash: string): Promise<void> {
    this.restored.push(commitHash)
  }
  async restoreFiles(_projectPath: string, commitHash: string, paths: readonly string[]): Promise<void> {
    this.restoredFiles.push([commitHash, paths])
  }
  async changedPaths(_projectPath: string, from: string, to: string): Promise<readonly string[]> {
    const first = Number(from.slice(1))
    const last = Number(to.slice(1))
    const paths: string[] = []
    for (let index = first + 1; index <= last; index += 1) paths.push(...(this.changed.get(`c${index}`) ?? []))
    return paths
  }
  async changesSince(): Promise<{ files: FileDiff[]; truncated: boolean }> {
    const all = new Set([...this.changed.values()].flat())
    return { files: [...all].sort().map(file), truncated: false }
  }
  async diff(): Promise<{ files: []; truncated: boolean }> {
    return { files: [], truncated: false }
  }
}

class MemoryRepository implements SnapshotRepository {
  readonly rows: Snapshot[] = []
  save(snapshot: Snapshot): void {
    this.rows.push(snapshot)
  }
  listForSession(_providerId: string, sessionExternalId: string): readonly Snapshot[] {
    return this.rows.filter((row) => row.sessionExternalId === sessionExternalId)
  }
  get(id: string): Snapshot | undefined {
    return this.rows.find((row) => row.id === id)
  }
  markReviewed(): void {}
}

function setup(active: string[] = []) {
  const shadow = new FakeShadow()
  const repository = new MemoryRepository()
  const changed: string[] = []
  let id = 0
  const service = new SnapshotService({
    shadow,
    repository,
    attribution: new ChangeAttribution(shadow),
    activeProjects: () => active,
    newId: () => `id-${++id}`,
    now: () => new Date('2026-10-04T12:00:00.000Z'),
    onChanged: (session) => changed.push(session),
    log: () => undefined,
  })
  const kinds = () => repository.rows.map((row) => [row.kind, row.commitHash, row.label])
  return { service, shadow, repository, changed, kinds }
}

/** Lance une session identifiée « s-1 » avec une première consigne. */
async function started(context: ReturnType<typeof setup>, prompt = 'Corrige le 404\nsur les pages') {
  context.service.trackRun('run-1', '/p', null, await context.service.takeBaseline('/p'), prompt)
  context.service.identified('run-1', 's-1')
}

describe('SnapshotService', () => {
  it('capture le départ, puis seulement les tours qui modifient des fichiers', async () => {
    const context = setup()
    await started(context)
    context.shadow.dirty = ['a.ts']
    await context.service.afterTurn('run-1')
    await context.service.beforePrompt('run-1', 'Explique-moi le code')
    await context.service.afterTurn('run-1')
    expect(context.kinds()).toEqual([
      ['baseline', 'c1', null],
      ['turn', 'c2', 'Corrige le 404 sur les pages'],
    ])
    expect(context.changed).toEqual(['s-1', 's-1'])
  })

  it('range une modification faite entre deux tours hors du travail de l’agent', async () => {
    const context = setup()
    await started(context)
    context.shadow.dirty = ['a.ts', 'b.ts']
    await context.service.afterTurn('run-1')
    context.shadow.dirty = ['notes.md', 'b.ts']
    await context.service.beforePrompt('run-1', 'Ajoute un test')
    // Une consigne envoyée pendant le tour le rejoint, sans capture.
    await context.service.beforePrompt('run-1', 'Et commente-le')
    context.shadow.dirty = ['a.test.ts']
    await context.service.afterTurn('run-1')

    expect(context.kinds()).toEqual([
      ['baseline', 'c1', null],
      ['turn', 'c2', 'Corrige le 404 sur les pages'],
      ['prompt', 'c3', null],
      ['turn', 'c4', 'Ajoute un test'],
    ])
    const changes = await context.service.changes('s-1')
    expect(changes.agentFiles.map((entry) => [entry.file.path, entry.alsoOutside])).toEqual([
      ['a.test.ts', false],
      ['a.ts', false],
      ['b.ts', true],
    ])
    expect(changes.otherFiles.map((entry) => entry.path)).toEqual(['notes.md'])
    expect(changes.turns.map((turn) => [turn.before.commitHash, turn.snapshot.commitHash])).toEqual([
      ['c1', 'c2'],
      ['c3', 'c4'],
    ])
  })

  it('ne garde la capture de départ d’une session reprise que si le projet a changé', async () => {
    const context = setup()
    await started(context)
    context.shadow.dirty = ['a.ts']
    await context.service.afterTurn('run-1')
    context.service.trackRun('run-2', '/p', 's-1', await context.service.takeBaseline('/p', 's-1'), 'Suite')
    context.shadow.dirty = ['README.md']
    context.service.trackRun('run-3', '/p', 's-1', await context.service.takeBaseline('/p', 's-1'), 'Encore')
    expect(context.kinds().map(([kind]) => kind)).toEqual(['baseline', 'turn', 'baseline'])
  })

  it('revient avant un tour, puis annule ce retour', async () => {
    const context = setup()
    await started(context)
    context.shadow.dirty = ['a.ts']
    await context.service.afterTurn('run-1')
    await context.service.beforePrompt('run-1', 'Deuxième')
    context.shadow.dirty = ['b.ts']
    await context.service.afterTurn('run-1')
    const secondTurn = context.repository.rows[2]
    await context.service.restore({ kind: 'before-turn', snapshotId: secondTurn?.id ?? '' })
    expect(context.shadow.restored).toEqual(['c2'])
    const safety = context.repository.rows.at(-1)
    expect(safety?.kind).toBe('before_restore')
    expect((await context.service.changes('s-1')).undoable?.id).toBe(safety?.id)

    await context.service.restore({ kind: 'undo', sessionExternalId: 's-1' })
    expect(context.shadow.restored).toEqual(['c2', safety?.commitHash])
  })

  it('revient à l’état d’avant la session, ou remet quelques fichiers', async () => {
    const context = setup()
    await started(context)
    context.shadow.dirty = ['a.ts', 'b.ts']
    await context.service.afterTurn('run-1')
    const start = context.repository.rows[0]
    await context.service.restore({ kind: 'files', snapshotId: start?.id ?? '', paths: ['a.ts'] })
    await context.service.restore({ kind: 'session-start', sessionExternalId: 's-1' })
    expect(context.shadow.restoredFiles).toEqual([['c1', ['a.ts']]])
    expect(context.shadow.restored).toEqual(['c1'])
  })

  it('refuse un retour pendant qu’un agent travaille dans le projet', async () => {
    const context = setup(['/p'])
    await started(context)
    await expect(context.service.restore({ kind: 'session-start', sessionExternalId: 's-1' })).rejects.toMatchObject({
      code: 'agent_running',
    })
  })

  it('signale un point de retour introuvable', async () => {
    const { service } = setup()
    await expect(service.restore({ kind: 'undo', sessionExternalId: 's-1' })).rejects.toMatchObject({
      code: 'snapshot_not_found',
    })
  })

  it('laisse l’agent travailler sans capture quand git est absent', async () => {
    const context = setup()
    context.shadow.available = false
    await started(context)
    await context.service.afterTurn('run-1')
    expect(context.repository.rows).toEqual([])
    expect(await context.service.changes('s-1')).toMatchObject({ available: false, tracked: false })
  })
})
