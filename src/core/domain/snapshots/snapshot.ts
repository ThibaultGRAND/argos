import type { ProviderId } from '../history/provider'
import type { FileDiff } from '../review/diff'

/**
 * Capture des fichiers d'un projet, prise par Argos (features/agent_changes.md). Mécanisme interne et invisible :
 * l'interface parle de modifications, de tours et de reviews.
 * - `baseline` : avant la première consigne d'un lancement ;
 * - `prompt` : avant une consigne suivante, si le projet a changé depuis la fin du tour précédent ;
 * - `turn` : fin d'un tour qui a modifié des fichiers ;
 * - `before_restore` : capture de sécurité avant un retour en arrière.
 */
export type SnapshotKind = 'baseline' | 'prompt' | 'turn' | 'before_restore'

export interface CommitStats {
  readonly filesChanged: number
  readonly linesAdded: number
  readonly linesRemoved: number
}

export interface Snapshot extends CommitStats {
  readonly id: string
  readonly projectPath: string
  readonly providerId: ProviderId
  readonly sessionExternalId: string
  /** Ordre des captures dans la session. */
  readonly ordinal: number
  readonly kind: SnapshotKind
  readonly commitHash: string
  readonly parentCommitHash: string | null
  /** Début de la consigne qui a lancé le tour ; `null` hors des captures de fin de tour. */
  readonly label: string | null
  /** Review faite jusqu'à cette capture. */
  readonly reviewedAt: string | null
  readonly createdAt: string
}

/** Rang de la prochaine capture d'une session : 0 pour la première. */
export function nextOrdinal(existing: readonly Pick<Snapshot, 'ordinal'>[]): number {
  return existing.reduce((highest, snapshot) => Math.max(highest, snapshot.ordinal + 1), 0)
}

/** Deux captures qui encadrent des modifications. */
export interface Interval {
  readonly from: Snapshot
  readonly to: Snapshot
}

/** Un tour qui a modifié des fichiers : de l'état au début du tour à sa fin. */
export interface TurnChange {
  readonly snapshot: Snapshot
  readonly before: Snapshot
}

/** Lecture des captures d'une session en termes de modifications. */
export interface SessionCheckpoints {
  /** État d'avant la session (première capture). */
  readonly start: Snapshot | undefined
  /** Tours qui ont modifié des fichiers, dans l'ordre. */
  readonly turns: readonly TurnChange[]
  /** Modifications faites hors des tours de l'agent (entre deux tours, entre deux lancements). */
  readonly outside: readonly Interval[]
  /** Capture de sécurité du dernier retour, tant que rien n'a été capturé depuis : le retour est annulable. */
  readonly undoable: Snapshot | undefined
  /** Dernière capture relue. */
  readonly reviewed: Snapshot | undefined
}

export function checkpointsOf(snapshots: readonly Snapshot[]): SessionCheckpoints {
  const ordered = [...snapshots].sort((a, b) => a.ordinal - b.ordinal)
  const turns: TurnChange[] = []
  const outside: Interval[] = []
  ordered.forEach((snapshot, index) => {
    const before = ordered[index - 1]
    if (before === undefined) return
    // Les captures de tours sans modification (avant la refonte) sont ignorées.
    if (snapshot.kind === 'turn' && snapshot.filesChanged > 0) turns.push({ snapshot, before })
    // Un début de tour qui diffère de la capture précédente : quelqu'un d'autre que l'agent a modifié des fichiers.
    // Après une capture de sécurité, l'écart vient du retour lui-même : ce n'est pas une modification extérieure.
    const startsTurn = snapshot.kind === 'prompt' || snapshot.kind === 'baseline'
    if (startsTurn && before.kind !== 'before_restore' && snapshot.filesChanged > 0) {
      outside.push({ from: before, to: snapshot })
    }
  })
  const last = ordered.at(-1)
  return {
    start: ordered[0],
    turns,
    outside,
    undoable: last?.kind === 'before_restore' ? last : undefined,
    reviewed: [...ordered].reverse().find((snapshot) => snapshot.reviewedAt !== null),
  }
}

export type ReviewRange =
  | { readonly kind: 'session' }
  | { readonly kind: 'since-review' }
  | { readonly kind: 'turn'; readonly snapshotId: string }

/** Bornes d'une review et les intervalles qui permettent d'attribuer chaque fichier. */
export interface ReviewBounds {
  readonly from: Snapshot
  readonly to: Snapshot
  readonly turns: readonly TurnChange[]
  readonly outside: readonly Interval[]
}

/**
 * Captures à comparer pour une review. Le travail de l'agent s'arrête à son dernier tour :
 * une capture de sécurité n'est pas un travail à relire. `undefined` si rien n'est à comparer.
 */
export function reviewBounds(snapshots: readonly Snapshot[], range: ReviewRange): ReviewBounds | undefined {
  const { start, turns, outside, reviewed } = checkpointsOf(snapshots)
  const lastTurn = turns.at(-1)?.snapshot
  const within = (from: Snapshot, to: Snapshot): ReviewBounds => ({
    from,
    to,
    turns: turns.filter((turn) => turn.before.ordinal >= from.ordinal && turn.snapshot.ordinal <= to.ordinal),
    outside: outside.filter((interval) => interval.from.ordinal >= from.ordinal && interval.to.ordinal <= to.ordinal),
  })
  switch (range.kind) {
    case 'session':
      return start === undefined || lastTurn === undefined ? undefined : within(start, lastTurn)
    case 'since-review':
      return reviewed === undefined || lastTurn === undefined || lastTurn.ordinal <= reviewed.ordinal
        ? undefined
        : within(reviewed, lastTurn)
    case 'turn': {
      const turn = turns.find((candidate) => candidate.snapshot.id === range.snapshotId)
      return turn === undefined ? undefined : within(turn.before, turn.snapshot)
    }
  }
}

/** Un fichier modifié, attribué à l'agent ou non. */
export interface AttributedFile<F> {
  readonly file: F
  /** Vrai si le fichier a aussi été modifié hors des tours de l'agent. */
  readonly alsoOutside: boolean
}

/**
 * Sépare le travail de l'agent des autres modifications. Un fichier touché des deux côtés reste chez l'agent,
 * signalé « modifié aussi hors de l'agent ». Un fichier renommé est reconnu par son nouveau ou son ancien chemin.
 */
export function attributeFiles<F extends Pick<FileDiff, 'path' | 'oldPath'>>(
  files: readonly F[],
  agentPaths: ReadonlySet<string>,
  outsidePaths: ReadonlySet<string>,
): { readonly agent: readonly AttributedFile<F>[]; readonly other: readonly F[] } {
  const touches = (file: F, paths: ReadonlySet<string>): boolean =>
    paths.has(file.path) || (file.oldPath !== null && paths.has(file.oldPath))
  const agent: AttributedFile<F>[] = []
  const other: F[] = []
  for (const file of files) {
    if (touches(file, agentPaths)) agent.push({ file, alsoOutside: touches(file, outsidePaths) })
    else other.push(file)
  }
  return { agent, other }
}

/** Début d'une consigne, pour désigner un tour. */
export function turnLabel(prompt: string, maxLength = 80): string {
  const line = prompt.replace(/\s+/g, ' ').trim()
  return line.length <= maxLength ? line : `${line.slice(0, maxLength - 1)}…`
}
