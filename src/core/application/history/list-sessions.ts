import type { SessionSummary } from '../../domain/history/read-models'
import { resolveSessionTitle } from '../../domain/history/session-title'
import type { SessionQueries } from '../../domain/ports/session-queries'

const MAX_SESSIONS = 100

/** Sessions d'un projet, les plus récentes en premier, avec leur titre résolu. */
export class ListSessions {
  constructor(private readonly queries: SessionQueries) {}

  execute(projectId: number, query?: string): readonly SessionSummary[] {
    const trimmed = query?.trim()
    return this.queries.listSessions(projectId, trimmed === '' ? undefined : trimmed, MAX_SESSIONS).map((row) => ({
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
    }))
  }
}
