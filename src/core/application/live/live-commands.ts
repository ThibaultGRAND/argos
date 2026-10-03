import { DomainError } from '../../domain/errors'
import type { SessionQueries } from '../../domain/ports/session-queries'
import type { LiveSessions } from './live-sessions'

/** Démarrer ou reprendre une session à partir des identifiants de l'index (F05). */
export class LiveCommands {
  constructor(
    private readonly sessions: LiveSessions,
    private readonly queries: SessionQueries,
  ) {}

  startInProject(projectId: number, text: string, model?: string): string {
    const project = this.queries.getProject(projectId)
    if (project === undefined) throw new DomainError('project_not_found', 'Projet introuvable', { projectId })
    return this.sessions.start(project.path, text, model)
  }

  continueSession(sessionId: number, text: string, model?: string): string {
    const session = this.queries.getSession(sessionId)
    if (session === undefined) throw new DomainError('session_not_found', 'Session introuvable', { sessionId })
    return this.sessions.continue(session.externalId, session.projectPath, text, model)
  }
}
