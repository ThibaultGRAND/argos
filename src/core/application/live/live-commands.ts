import { DomainError } from '../../domain/errors'
import type { SessionQueries } from '../../domain/ports/session-queries'
import type { SnapshotService } from '../snapshots/snapshot-service'
import type { LiveSessions } from './live-sessions'

/**
 * Démarrer ou reprendre une session à partir des identifiants de l'index (F05),
 * avec un snapshot S0 des fichiers pris avant que l'agent n'agisse (F06).
 */
export class LiveCommands {
  constructor(
    private readonly sessions: LiveSessions,
    private readonly queries: SessionQueries,
    private readonly snapshots: SnapshotService,
  ) {}

  async startInProject(projectId: number, text: string, model?: string): Promise<string> {
    const project = this.queries.getProject(projectId)
    if (project === undefined) throw new DomainError('project_not_found', 'Projet introuvable', { projectId })
    const baseline = await this.snapshots.takeBaseline(project.path)
    const runId = this.sessions.start(project.path, text, model)
    this.snapshots.trackRun(runId, project.path, null, baseline, text)
    return runId
  }

  /** Consigne pour une session déjà lancée : entre deux tours, le projet est capturé avant que l'agent ne reprenne. */
  async send(runId: string, text: string): Promise<void> {
    await this.snapshots.beforePrompt(runId, text)
    this.sessions.send(runId, text)
  }

  async continueSession(sessionId: number, text: string, model?: string): Promise<string> {
    const session = this.queries.getSession(sessionId)
    if (session === undefined) throw new DomainError('session_not_found', 'Session introuvable', { sessionId })
    const active = this.sessions.activeRunFor(session.externalId)
    if (active !== undefined) {
      await this.send(active, text)
      return active
    }
    const baseline = await this.snapshots.takeBaseline(session.projectPath, session.externalId)
    const runId = this.sessions.continue(session.externalId, session.projectPath, text, model)
    this.snapshots.trackRun(runId, session.projectPath, session.externalId, baseline, text)
    return runId
  }
}
