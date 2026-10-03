import { DomainError } from '../../domain/errors'
import {
  statusAfter,
  type LiveEvent,
  type LiveStatus,
  type PermissionDecision,
  type PermissionRequest,
} from '../../domain/live/live-events'
import type { AgentRuntime, LiveRun } from '../../domain/ports/agent-runtime'

export interface RunSummary {
  readonly runId: string
  readonly projectPath: string
  readonly sessionExternalId: string | null
  readonly status: LiveStatus
  readonly pendingPermissions: readonly PermissionRequest[]
}

interface RunState {
  readonly runId: string
  readonly projectPath: string
  sessionExternalId: string | null
  status: LiveStatus
  pendingPermissions: PermissionRequest[]
  readonly run: LiveRun
}

export interface LiveSessionsListener {
  /** Chaque événement d'une session, pour l'affichage en direct. */
  onEvent(runId: string, event: LiveEvent): void
  /** Fin d'un tour : l'historique de la CLI vient d'être écrit, l'import peut le reprendre. */
  onTurnCompleted(runId: string): void
}

/** Registre des sessions pilotées par Argos (F05) : démarrage, reprise, envoi, pause, arrêt, permissions. */
export class LiveSessions {
  private readonly runs = new Map<string, RunState>()

  constructor(
    private readonly runtime: AgentRuntime,
    private readonly listener: LiveSessionsListener,
    private readonly newId: () => string,
  ) {}

  start(projectPath: string, text: string, model?: string): string {
    return this.launch(projectPath, text, model, undefined)
  }

  /** Reprend une session existante ; si Argos la pilote déjà, envoie simplement le message. */
  continue(sessionExternalId: string, projectPath: string, text: string, model?: string): string {
    const active = [...this.runs.values()].find(
      (state) => state.sessionExternalId === sessionExternalId && state.status !== 'ended' && state.status !== 'error',
    )
    if (active !== undefined) {
      this.send(active.runId, text)
      return active.runId
    }
    return this.launch(projectPath, text, model, sessionExternalId)
  }

  send(runId: string, text: string): void {
    const state = this.get(runId)
    if (state.status === 'ended') throw new DomainError('run_ended', 'Session terminée', { runId })
    state.run.send(text)
    this.emit(state, { type: 'user-message', text, occurredAt: new Date().toISOString() })
  }

  async interrupt(runId: string): Promise<void> {
    await this.get(runId).run.interrupt()
  }

  stop(runId: string): void {
    const state = this.get(runId)
    state.run.stop()
    this.emit(state, { type: 'status', status: 'ended' })
  }

  answer(runId: string, requestId: string, decision: PermissionDecision): void {
    const state = this.get(runId)
    if (!state.pendingPermissions.some((request) => request.requestId === requestId)) {
      throw new DomainError('permission_not_found', 'Demande de permission introuvable', { runId, requestId })
    }
    state.run.answerPermission(requestId, decision)
    this.emit(state, { type: 'permission-resolved', requestId })
  }

  list(): readonly RunSummary[] {
    return [...this.runs.values()].map((state) => ({
      runId: state.runId,
      projectPath: state.projectPath,
      sessionExternalId: state.sessionExternalId,
      status: state.status,
      pendingPermissions: [...state.pendingPermissions],
    }))
  }

  /** Arrête toutes les sessions (fermeture de l'app). */
  stopAll(): void {
    for (const state of this.runs.values()) {
      if (state.status !== 'ended') state.run.stop()
    }
  }

  private launch(
    projectPath: string,
    text: string,
    model: string | undefined,
    resumeExternalId: string | undefined,
  ): string {
    const runId = this.newId()
    // L'état est enregistré après le démarrage ; les événements arrivés avant sont mis de côté puis rejoués.
    const registered: { state?: RunState } = {}
    const pending: LiveEvent[] = []
    const run = this.runtime.start(
      {
        cwd: projectPath,
        ...(model === undefined ? {} : { model }),
        ...(resumeExternalId === undefined ? {} : { resumeExternalId }),
      },
      (event) => {
        if (registered.state === undefined) pending.push(event)
        else this.emit(registered.state, event)
      },
    )
    const state: RunState = {
      runId,
      projectPath,
      sessionExternalId: resumeExternalId ?? null,
      status: 'starting',
      pendingPermissions: [],
      run,
    }
    registered.state = state
    this.runs.set(runId, state)
    for (const event of pending) this.emit(state, event)
    this.send(runId, text)
    return runId
  }

  private emit(state: RunState, event: LiveEvent): void {
    if (event.type === 'identified') state.sessionExternalId = event.sessionExternalId
    if (event.type === 'permission-requested') state.pendingPermissions.push(event.request)
    if (event.type === 'permission-resolved') {
      state.pendingPermissions = state.pendingPermissions.filter((request) => request.requestId !== event.requestId)
    }
    const next = statusAfter(state.status, event)
    if (next !== undefined) state.status = next

    this.listener.onEvent(state.runId, event)
    if (event.type === 'turn-completed') this.listener.onTurnCompleted(state.runId)
  }

  private get(runId: string): RunState {
    const state = this.runs.get(runId)
    if (state === undefined) throw new DomainError('run_not_found', 'Session en direct introuvable', { runId })
    return state
  }
}
