import { DomainError } from '../../domain/errors'
import type { ProviderId } from '../../domain/history/provider'
import type { ShadowCommit, ShadowRepository } from '../../domain/ports/shadow-repository'
import type { SnapshotRepository } from '../../domain/ports/snapshot-repository'
import type { FileDiff } from '../../domain/review/diff'
import {
  checkpointsOf,
  nextOrdinal,
  turnLabel,
  type AttributedFile,
  type Snapshot,
  type SnapshotKind,
  type TurnChange,
} from '../../domain/snapshots/snapshot'
import type { ChangeAttribution } from './change-attribution'

export interface SnapshotServiceDependencies {
  readonly shadow: ShadowRepository
  readonly repository: SnapshotRepository
  readonly attribution: ChangeAttribution
  /** Dossiers des projets dans lesquels un agent travaille en ce moment. */
  readonly activeProjects: () => readonly string[]
  readonly newId: () => string
  readonly now: () => Date
  readonly onChanged: (sessionExternalId: string) => void
  readonly log: (message: string) => void
}

interface RunTracking {
  readonly projectPath: string
  sessionExternalId: string | null
  /** Capture de départ prise avant que la session ne soit identifiée : enregistrée dès qu'elle l'est. */
  pendingBaseline: { readonly commit: ShadowCommit; readonly at: Date } | undefined
  /** Début de la première consigne du tour en cours. */
  turnLabel: string | null
  /** Vrai entre l'envoi d'une consigne et la fin du tour : une consigne de plus rejoint le tour en cours. */
  inTurn: boolean
}

/** Modifications d'une session pilotée par Argos, telles que les montre l'interface (features/agent_changes.md). */
export interface SessionChanges {
  /** Faux si git est absent : aucune capture possible. */
  readonly available: boolean
  /** Vrai si Argos a capturé cette session (sinon, le panneau D garde la liste tirée de l'historique). */
  readonly tracked: boolean
  /** Première capture de la session : état d'avant la session. */
  readonly start: Snapshot | undefined
  /** Fichiers qui diffèrent aujourd'hui de l'état d'avant la session, modifiés par l'agent. */
  readonly agentFiles: readonly AttributedFile<FileDiff>[]
  /** Fichiers qui diffèrent aujourd'hui, modifiés seulement hors des tours de l'agent. */
  readonly otherFiles: readonly FileDiff[]
  readonly truncated: boolean
  readonly turns: readonly TurnChange[]
  /** Capture de sécurité du dernier retour, s'il est encore annulable. */
  readonly undoable: Snapshot | undefined
}

export type RestoreAction =
  | { readonly kind: 'before-turn'; readonly snapshotId: string }
  | { readonly kind: 'session-start'; readonly sessionExternalId: string }
  | { readonly kind: 'undo'; readonly sessionExternalId: string }
  /** Quelques fichiers remis dans l'état d'une capture de la session (début de session ou début de la plage relue). */
  | { readonly kind: 'files'; readonly snapshotId: string; readonly paths: readonly string[] }

const PROVIDER: ProviderId = 'claude'

/**
 * Captures des sessions pilotées par Argos : avant la première consigne, avant chaque consigne suivante si le projet
 * a changé, à chaque fin de tour qui modifie des fichiers. Retours en arrière précédés d'une capture de sécurité.
 * Un échec de capture n'empêche jamais l'agent de travailler.
 */
export class SnapshotService {
  private readonly runs = new Map<string, RunTracking>()
  /** Une seule opération git à la fois par projet (le dépôt fantôme a un seul index). */
  private readonly queues = new Map<string, Promise<unknown>>()

  constructor(private readonly deps: SnapshotServiceDependencies) {}

  /**
   * Capture de départ d'un lancement, à prendre avant de démarrer l'agent. Pour une session reprise, comparée à sa
   * dernière capture. `undefined` si la capture est impossible (git absent…).
   */
  async takeBaseline(projectPath: string, sessionExternalId?: string): Promise<ShadowCommit | undefined> {
    try {
      if (!(await this.deps.shadow.isAvailable())) return undefined
      const previous = sessionExternalId === undefined ? undefined : this.lastCapture(sessionExternalId)
      return await this.serialized(projectPath, () =>
        this.deps.shadow.snapshot(projectPath, 'Argos : début de session', previous?.commitHash),
      )
    } catch (error) {
      this.deps.log(`Capture de départ impossible : ${describe(error)}`)
      return undefined
    }
  }

  /** Relie la capture de départ au lancement ; la première consigne désigne le premier tour. */
  trackRun(
    runId: string,
    projectPath: string,
    sessionExternalId: string | null,
    baseline: ShadowCommit | undefined,
    firstPrompt: string,
  ): void {
    const tracking: RunTracking = {
      projectPath,
      sessionExternalId,
      pendingBaseline: undefined,
      turnLabel: turnLabel(firstPrompt),
      inTurn: true,
    }
    this.runs.set(runId, tracking)
    if (baseline === undefined) return
    if (sessionExternalId === null) tracking.pendingBaseline = { commit: baseline, at: this.deps.now() }
    else this.recordBaseline(projectPath, sessionExternalId, baseline, this.deps.now())
  }

  /** La session a reçu son identifiant : la capture de départ en attente est enregistrée. */
  identified(runId: string, sessionExternalId: string): void {
    const tracking = this.runs.get(runId)
    if (tracking === undefined) return
    tracking.sessionExternalId = sessionExternalId
    const pending = tracking.pendingBaseline
    tracking.pendingBaseline = undefined
    if (pending !== undefined) this.recordBaseline(tracking.projectPath, sessionExternalId, pending.commit, pending.at)
  }

  /**
   * À appeler avant d'envoyer une consigne à une session déjà lancée. Entre deux tours, le projet est capturé :
   * ce qui a changé depuis la fin du tour précédent a été fait hors de l'agent.
   */
  async beforePrompt(runId: string, text: string): Promise<void> {
    const tracking = this.runs.get(runId)
    if (tracking === undefined) return
    if (tracking.inTurn) {
      tracking.turnLabel ??= turnLabel(text)
      return
    }
    tracking.inTurn = true
    tracking.turnLabel = turnLabel(text)
    await this.capture(tracking, 'prompt', null)
  }

  /** Fin d'un tour : une capture, gardée seulement si des fichiers ont changé. */
  async afterTurn(runId: string): Promise<void> {
    const tracking = this.runs.get(runId)
    if (tracking === undefined) return
    const label = tracking.turnLabel
    tracking.turnLabel = null
    tracking.inTurn = false
    await this.capture(tracking, 'turn', label)
  }

  async changes(sessionExternalId: string): Promise<SessionChanges> {
    const available = await this.deps.shadow.isAvailable()
    const { start, turns, outside, undoable } = checkpointsOf(this.listFor(sessionExternalId))
    const empty = { start, agentFiles: [], otherFiles: [], truncated: false, turns, undoable }
    if (!available || start === undefined) return { available, tracked: start !== undefined, ...empty }
    const { files, truncated } = await this.serialized(start.projectPath, () =>
      this.deps.shadow.changesSince(start.projectPath, start.commitHash),
    )
    const { agent, other } = await this.deps.attribution.attribute(files, turns, outside)
    return { available, tracked: true, start, agentFiles: agent, otherFiles: other, truncated, turns, undoable }
  }

  /** Annuler des fichiers, un tour, toute la session, ou le dernier retour. Toujours annulable à son tour. */
  async restore(action: RestoreAction): Promise<void> {
    const target = this.targetOf(action)
    if (this.deps.activeProjects().includes(target.projectPath)) {
      throw new DomainError('agent_running', 'Un agent travaille dans ce projet', { projectPath: target.projectPath })
    }
    await this.serialized(target.projectPath, async () => {
      const previous = this.lastCapture(target.sessionExternalId)
      const safety = await this.deps.shadow.snapshot(target.projectPath, 'Argos : avant retour', previous?.commitHash)
      this.record(target.projectPath, target.sessionExternalId, 'before_restore', safety, this.deps.now())
      if (action.kind === 'files')
        await this.deps.shadow.restoreFiles(target.projectPath, target.commitHash, action.paths)
      else await this.deps.shadow.restore(target.projectPath, target.commitHash)
    })
  }

  private targetOf(action: RestoreAction): Snapshot {
    if (action.kind === 'files') {
      const snapshot = this.deps.repository.get(action.snapshotId)
      if (snapshot === undefined || action.paths.length === 0) throw notFound(action.kind)
      return snapshot
    }
    const sessionExternalId =
      action.kind === 'before-turn'
        ? this.deps.repository.get(action.snapshotId)?.sessionExternalId
        : action.sessionExternalId
    const checkpoints = checkpointsOf(sessionExternalId === undefined ? [] : this.listFor(sessionExternalId))
    const target =
      action.kind === 'before-turn'
        ? checkpoints.turns.find((turn) => turn.snapshot.id === action.snapshotId)?.before
        : action.kind === 'session-start'
          ? checkpoints.start
          : checkpoints.undoable
    if (target === undefined) throw notFound(action.kind)
    return target
  }

  /** Capture de début ou de fin de tour, enregistrée seulement si le projet a changé depuis la dernière capture. */
  private async capture(tracking: RunTracking, kind: SnapshotKind, label: string | null): Promise<void> {
    const sessionExternalId = tracking.sessionExternalId
    if (sessionExternalId === null) return
    try {
      if (!(await this.deps.shadow.isAvailable())) return
      const previous = this.lastCapture(sessionExternalId)
      const commit = await this.serialized(tracking.projectPath, () =>
        this.deps.shadow.snapshot(tracking.projectPath, `Argos : ${kind} (${label ?? '—'})`, previous?.commitHash),
      )
      // Rien n'a changé : rien de visible (le commit reste dans le dépôt fantôme, sans effet).
      if (previous !== undefined && commit.stats.filesChanged === 0) return
      this.record(tracking.projectPath, sessionExternalId, kind, commit, this.deps.now(), label)
    } catch (error) {
      this.deps.log(`Capture impossible (${kind}) : ${describe(error)}`)
    }
  }

  /** La capture de départ d'un lancement repris n'est gardée que si le projet a changé depuis. */
  private recordBaseline(projectPath: string, sessionExternalId: string, commit: ShadowCommit, at: Date): void {
    if (this.lastCapture(sessionExternalId) !== undefined && commit.stats.filesChanged === 0) return
    this.record(projectPath, sessionExternalId, 'baseline', commit, at)
  }

  private listFor(sessionExternalId: string): readonly Snapshot[] {
    return this.deps.repository.listForSession(PROVIDER, sessionExternalId)
  }

  private lastCapture(sessionExternalId: string): Snapshot | undefined {
    return this.listFor(sessionExternalId).at(-1)
  }

  private record(
    projectPath: string,
    sessionExternalId: string,
    kind: SnapshotKind,
    commit: ShadowCommit,
    at: Date,
    label: string | null = null,
  ): Snapshot {
    const snapshot: Snapshot = {
      id: this.deps.newId(),
      projectPath,
      providerId: PROVIDER,
      sessionExternalId,
      ordinal: nextOrdinal(this.listFor(sessionExternalId)),
      kind,
      commitHash: commit.commitHash,
      parentCommitHash: commit.parentCommitHash,
      ...commit.stats,
      label,
      reviewedAt: null,
      createdAt: at.toISOString(),
    }
    this.deps.repository.save(snapshot)
    this.deps.onChanged(sessionExternalId)
    return snapshot
  }

  private serialized<T>(projectPath: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(projectPath) ?? Promise.resolve()
    const next = previous.then(operation, operation)
    this.queues.set(
      projectPath,
      next.catch((error: unknown) => (error instanceof Error ? undefined : Promise.reject(error))),
    )
    return next
  }
}

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error))
const notFound = (kind: RestoreAction['kind']): DomainError =>
  new DomainError('snapshot_not_found', 'Point de retour introuvable', { kind })
