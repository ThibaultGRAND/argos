import { DomainError } from '../../domain/errors'
import type { ProviderId } from '../../domain/history/provider'
import type { ShadowCommit, ShadowRepository } from '../../domain/ports/shadow-repository'
import type { SnapshotRepository } from '../../domain/ports/snapshot-repository'
import { nextOrdinal, type Snapshot, type SnapshotKind } from '../../domain/snapshots/snapshot'

export interface SnapshotServiceDependencies {
  readonly shadow: ShadowRepository
  readonly repository: SnapshotRepository
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
  /** Snapshot de départ pris avant que la session ne soit identifiée : enregistré dès qu'elle l'est. */
  pendingBaseline: { readonly commit: ShadowCommit; readonly at: Date } | undefined
}

export interface SnapshotList {
  readonly available: boolean
  readonly snapshots: readonly Snapshot[]
}

const PROVIDER: ProviderId = 'claude'

/**
 * Snapshots des sessions pilotées par Argos (F06) : S0 avant que l'agent n'agisse, un snapshot par fin de tour,
 * retour en arrière précédé d'un snapshot « avant retour ». Un échec de snapshot n'empêche jamais l'agent de travailler.
 */
export class SnapshotService {
  private readonly runs = new Map<string, RunTracking>()
  /** Une seule opération git à la fois par projet (le dépôt fantôme a un seul index). */
  private readonly queues = new Map<string, Promise<unknown>>()

  constructor(private readonly deps: SnapshotServiceDependencies) {}

  /** S0 : à appeler avant de démarrer l'agent. Renvoie `undefined` si le snapshot est impossible (git absent…). */
  async takeBaseline(projectPath: string): Promise<ShadowCommit | undefined> {
    try {
      if (!(await this.deps.shadow.isAvailable())) return undefined
      return await this.serialized(projectPath, () =>
        this.deps.shadow.snapshot(projectPath, 'Argos : S0 (avant la session)'),
      )
    } catch (error) {
      this.deps.log(`Snapshot de départ impossible : ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }

  /** Relie le snapshot de départ à la session démarrée. */
  trackRun(
    runId: string,
    projectPath: string,
    sessionExternalId: string | null,
    baseline: ShadowCommit | undefined,
  ): void {
    const tracking: RunTracking = { projectPath, sessionExternalId, pendingBaseline: undefined }
    this.runs.set(runId, tracking)
    if (baseline === undefined) return
    if (sessionExternalId === null) tracking.pendingBaseline = { commit: baseline, at: this.deps.now() }
    else this.record(tracking.projectPath, sessionExternalId, 'baseline', baseline, this.deps.now())
  }

  /** La session a reçu son identifiant : le snapshot de départ en attente est enregistré. */
  identified(runId: string, sessionExternalId: string): void {
    const tracking = this.runs.get(runId)
    if (tracking === undefined) return
    tracking.sessionExternalId = sessionExternalId
    const pending = tracking.pendingBaseline
    tracking.pendingBaseline = undefined
    if (pending !== undefined)
      this.record(tracking.projectPath, sessionExternalId, 'baseline', pending.commit, pending.at)
  }

  /** Fin d'un tour : un snapshot des fichiers du projet. */
  async afterTurn(runId: string): Promise<void> {
    const tracking = this.runs.get(runId)
    if (tracking?.sessionExternalId === null || tracking === undefined) return
    const sessionExternalId = tracking.sessionExternalId
    try {
      if (!(await this.deps.shadow.isAvailable())) return
      const ordinal = nextOrdinal(this.deps.repository.listForSession(PROVIDER, sessionExternalId))
      const commit = await this.serialized(tracking.projectPath, () =>
        this.deps.shadow.snapshot(tracking.projectPath, `Argos : S${ordinal} (fin de tour)`),
      )
      this.record(tracking.projectPath, sessionExternalId, 'turn', commit, this.deps.now())
    } catch (error) {
      this.deps.log(`Snapshot de fin de tour impossible : ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async list(sessionExternalId: string): Promise<SnapshotList> {
    return {
      available: await this.deps.shadow.isAvailable(),
      snapshots: this.deps.repository.listForSession(PROVIDER, sessionExternalId),
    }
  }

  /** Revient à un snapshot ; un snapshot « avant retour » est pris d'abord, pour pouvoir annuler. */
  async restore(snapshotId: string): Promise<Snapshot> {
    const target = this.deps.repository.get(snapshotId)
    if (target === undefined) throw new DomainError('snapshot_not_found', 'Snapshot introuvable', { snapshotId })
    if (this.deps.activeProjects().includes(target.projectPath)) {
      throw new DomainError('agent_running', 'Un agent travaille dans ce projet', { projectPath: target.projectPath })
    }
    return this.serialized(target.projectPath, async () => {
      const ordinal = nextOrdinal(this.deps.repository.listForSession(target.providerId, target.sessionExternalId))
      const safetyCommit = await this.deps.shadow.snapshot(
        target.projectPath,
        `Argos : S${ordinal} (avant retour à S${target.ordinal})`,
      )
      const safety = this.record(
        target.projectPath,
        target.sessionExternalId,
        'before_restore',
        safetyCommit,
        this.deps.now(),
      )
      await this.deps.shadow.restore(target.projectPath, target.commitHash)
      return safety
    })
  }

  private record(
    projectPath: string,
    sessionExternalId: string,
    kind: SnapshotKind,
    commit: ShadowCommit,
    at: Date,
  ): Snapshot {
    const snapshot: Snapshot = {
      id: this.deps.newId(),
      projectPath,
      providerId: PROVIDER,
      sessionExternalId,
      ordinal: nextOrdinal(this.deps.repository.listForSession(PROVIDER, sessionExternalId)),
      kind,
      commitHash: commit.commitHash,
      parentCommitHash: commit.parentCommitHash,
      ...commit.stats,
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
