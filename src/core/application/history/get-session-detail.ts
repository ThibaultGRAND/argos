import { DomainError } from '../../domain/errors'
import type { SessionDetail } from '../../domain/history/read-models'
import { resolveSessionTitle } from '../../domain/history/session-title'
import type { SessionQueries } from '../../domain/ports/session-queries'

/** Fiche d'une session et ses fichiers modifiés (F02). */
export class GetSessionDetail {
  constructor(private readonly queries: SessionQueries) {}

  execute(sessionId: number): SessionDetail {
    const row = this.queries.getSession(sessionId)
    if (row === undefined) {
      throw new DomainError('session_not_found', `Session introuvable : ${sessionId}`, { sessionId })
    }
    return {
      id: row.id,
      providerId: row.providerId,
      externalId: row.externalId,
      title: resolveSessionTitle({
        customTitle: row.customTitle,
        generatedTitle: row.generatedTitle,
        firstPrompt: row.firstPrompt,
      }),
      excerpt: row.lastExcerpt,
      model: row.model,
      startedAt: row.startedAt,
      lastActivityAt: row.lastActivityAt,
      messageCount: row.messageCount,
      filesChanged: row.filesChanged,
      linesAdded: row.linesAdded,
      linesRemoved: row.linesRemoved,
      projectId: row.projectId,
      projectName: row.projectName,
      projectPath: row.projectPath,
      gitBranch: row.gitBranch,
      cliVersion: row.cliVersion,
      toolCallCount: row.toolCallCount,
      files: this.queries.listSessionFiles(sessionId),
    }
  }
}
