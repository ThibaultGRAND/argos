import { describe, expect, it } from 'vitest'
import { attributeFiles, checkpointsOf, nextOrdinal, reviewBounds, turnLabel, type Snapshot } from './snapshot'

let counter = 0
function snap(kind: Snapshot['kind'], filesChanged = 1, reviewedAt: string | null = null): Snapshot {
  const ordinal = counter++
  return {
    id: `s${ordinal}`,
    projectPath: '/p',
    providerId: 'claude',
    sessionExternalId: 'x',
    ordinal,
    kind,
    commitHash: `c${ordinal}`,
    parentCommitHash: null,
    label: kind === 'turn' ? `Tour ${ordinal}` : null,
    reviewedAt,
    filesChanged,
    linesAdded: filesChanged,
    linesRemoved: 0,
    createdAt: `2026-10-04T10:0${ordinal}:00.000Z`,
  }
}

const ids = (list: readonly { snapshot: Snapshot; before: Snapshot }[]) =>
  list.map((turn) => [turn.before.id, turn.snapshot.id])

describe('captures d’une session', () => {
  it('numérote à partir de 0', () => {
    expect(nextOrdinal([])).toBe(0)
    expect(nextOrdinal([{ ordinal: 0 }, { ordinal: 3 }])).toBe(4)
  })

  it('reconnaît les tours de l’agent et les modifications faites entre deux tours', () => {
    counter = 0
    // S0, tour 1, modification à la main avant la consigne 2, tour 2, tour sans modification (ancienne capture).
    const list = [snap('baseline', 0), snap('turn', 2), snap('prompt', 1), snap('turn', 1), snap('turn', 0)]
    const { start, turns, outside, undoable } = checkpointsOf(list)
    expect(start?.id).toBe('s0')
    expect(ids(turns)).toEqual([
      ['s0', 's1'],
      ['s2', 's3'],
    ])
    expect(outside.map((interval) => [interval.from.id, interval.to.id])).toEqual([['s1', 's2']])
    expect(undoable).toBeUndefined()
  })

  it('ne prend pas un retour en arrière pour une modification extérieure', () => {
    counter = 0
    const list = [snap('baseline', 0), snap('turn'), snap('before_restore', 0), snap('prompt', 1)]
    expect(checkpointsOf(list).outside).toEqual([])
  })

  it('rend un retour annulable tant que rien n’a été capturé depuis', () => {
    counter = 0
    const list = [snap('baseline', 0), snap('turn'), snap('before_restore')]
    expect(checkpointsOf(list).undoable?.id).toBe('s2')
    expect(checkpointsOf([...list, snap('prompt')]).undoable).toBeUndefined()
  })

  it('calcule les bornes de la review : session, depuis la dernière review, un tour', () => {
    counter = 0
    const list = [
      snap('baseline', 0),
      snap('turn', 1, '2026-10-04T10:05:00.000Z'),
      snap('prompt', 1),
      snap('turn'),
      snap('before_restore'),
    ]
    const session = reviewBounds(list, { kind: 'session' })
    expect([session?.from.id, session?.to.id, session?.turns.length, session?.outside.length]).toEqual([
      's0',
      's3',
      2,
      1,
    ])
    const since = reviewBounds(list, { kind: 'since-review' })
    expect([since?.from.id, since?.to.id, since?.turns.length, since?.outside.length]).toEqual(['s1', 's3', 1, 1])
    const turn = reviewBounds(list, { kind: 'turn', snapshotId: 's3' })
    expect([turn?.from.id, turn?.to.id, turn?.outside.length]).toEqual(['s2', 's3', 0])
    expect(reviewBounds(list.slice(0, 2), { kind: 'since-review' })).toBeUndefined()
    expect(reviewBounds([list[0] as Snapshot], { kind: 'session' })).toBeUndefined()
  })

  it('sépare le travail de l’agent des autres modifications', () => {
    const files = [
      { path: 'a.ts', oldPath: null },
      { path: 'b.ts', oldPath: null },
      { path: 'nouveau.ts', oldPath: 'ancien.ts' },
      { path: 'notes.md', oldPath: null },
    ]
    const { agent, other } = attributeFiles(
      files,
      new Set(['a.ts', 'b.ts', 'ancien.ts']),
      new Set(['b.ts', 'notes.md']),
    )
    expect(agent.map((entry) => [entry.file.path, entry.alsoOutside])).toEqual([
      ['a.ts', false],
      ['b.ts', true],
      ['nouveau.ts', false],
    ])
    expect(other.map((file) => file.path)).toEqual(['notes.md'])
  })

  it('désigne un tour par le début de sa consigne', () => {
    expect(turnLabel('  Corrige\nle 404  ')).toBe('Corrige le 404')
    expect(turnLabel('a'.repeat(100), 10)).toBe(`${'a'.repeat(9)}…`)
  })
})
