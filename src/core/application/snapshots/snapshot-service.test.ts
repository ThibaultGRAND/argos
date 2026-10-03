import { describe, expect, it } from 'vitest'
import type { ShadowCommit, ShadowRepository } from '../../domain/ports/shadow-repository'
import type { SnapshotRepository } from '../../domain/ports/snapshot-repository'
import type { Snapshot } from '../../domain/snapshots/snapshot'
import { SnapshotService } from './snapshot-service'

class FakeShadow implements ShadowRepository {
  commits = 0
  readonly restored: string[] = []
  available = true
  async isAvailable(): Promise<boolean> {
    return this.available
  }
  async snapshot(): Promise<ShadowCommit> {
    this.commits += 1
    return {
      commitHash: `c${this.commits}`,
      parentCommitHash: null,
      stats: { filesChanged: 1, linesAdded: 2, linesRemoved: 0 },
    }
  }
  async restore(_projectPath: string, commitHash: string): Promise<void> {
    this.restored.push(commitHash)
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
}

function setup(active: string[] = []) {
  const shadow = new FakeShadow()
  const repository = new MemoryRepository()
  const changed: string[] = []
  let id = 0
  const service = new SnapshotService({
    shadow,
    repository,
    activeProjects: () => active,
    newId: () => `id-${++id}`,
    now: () => new Date('2026-10-03T12:00:00.000Z'),
    onChanged: (session) => changed.push(session),
    log: () => undefined,
  })
  return { service, shadow, repository, changed }
}

describe('SnapshotService', () => {
  it('enregistre S0 dès que la session est identifiée, puis un snapshot par fin de tour', async () => {
    const { service, repository, changed } = setup()
    const baseline = await service.takeBaseline('/p')
    service.trackRun('run-1', '/p', null, baseline)
    expect(repository.rows).toHaveLength(0)

    service.identified('run-1', 's-1')
    await service.afterTurn('run-1')
    await service.afterTurn('run-1')
    expect(repository.rows.map((row) => [row.ordinal, row.kind, row.commitHash])).toEqual([
      [0, 'baseline', 'c1'],
      [1, 'turn', 'c2'],
      [2, 'turn', 'c3'],
    ])
    expect(changed).toEqual(['s-1', 's-1', 's-1'])
  })

  it('reprend une session connue avec S0 enregistré tout de suite', async () => {
    const { service, repository } = setup()
    service.trackRun('run-1', '/p', 's-9', await service.takeBaseline('/p'))
    expect(repository.rows[0]).toMatchObject({ sessionExternalId: 's-9', kind: 'baseline', ordinal: 0 })
  })

  it('revient à un snapshot après en avoir pris un « avant retour »', async () => {
    const { service, shadow, repository } = setup()
    service.trackRun('run-1', '/p', 's-1', await service.takeBaseline('/p'))
    await service.afterTurn('run-1')
    const target = repository.rows[0]
    const safety = await service.restore(target?.id ?? '')
    expect(safety).toMatchObject({ kind: 'before_restore', ordinal: 2 })
    expect(shadow.restored).toEqual(['c1'])
  })

  it('refuse un retour pendant qu’un agent travaille dans le projet', async () => {
    const { service, repository } = setup(['/p'])
    service.trackRun('run-1', '/p', 's-1', await service.takeBaseline('/p'))
    await expect(service.restore(repository.rows[0]?.id ?? '')).rejects.toMatchObject({ code: 'agent_running' })
  })

  it('laisse l’agent travailler sans snapshot quand git est absent', async () => {
    const { service, shadow, repository } = setup()
    shadow.available = false
    service.trackRun('run-1', '/p', 's-1', await service.takeBaseline('/p'))
    await service.afterTurn('run-1')
    expect(repository.rows).toEqual([])
    expect((await service.list('s-1')).available).toBe(false)
  })
})
