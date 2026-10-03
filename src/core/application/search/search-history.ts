import type { SearchQueries } from '../../domain/ports/search-queries'
import { resolveSessionTitle } from '../../domain/history/session-title'
import { normalizeSearchText, periodStart, type SearchPeriod, type SearchResults } from '../../domain/search/search'

const MAX_SESSIONS = 8
const MAX_MESSAGES = 50

export interface SearchRequest {
  readonly query: string
  readonly projectId?: number
  readonly period?: SearchPeriod
}

/** Recherche plein texte dans toutes les conversations (F03). */
export class SearchHistory {
  constructor(
    private readonly queries: SearchQueries,
    private readonly now: () => Date = () => new Date(),
  ) {}

  execute(request: SearchRequest): SearchResults {
    const text = normalizeSearchText(request.query)
    if (text === undefined) return { sessions: [], messages: [] }

    const since = periodStart(request.period ?? 'all', this.now())
    const filters = {
      ...(request.projectId === undefined ? {} : { projectId: request.projectId }),
      ...(since === undefined ? {} : { since }),
    }
    const title = (row: { customTitle: string | null; generatedTitle: string | null; firstPrompt: string | null }) =>
      resolveSessionTitle({
        customTitle: row.customTitle,
        generatedTitle: row.generatedTitle,
        firstPrompt: row.firstPrompt,
      })

    return {
      sessions: this.queries.searchSessions(text, filters, MAX_SESSIONS).map((row) => ({
        sessionId: row.sessionId,
        title: title(row),
        projectName: row.projectName,
        lastActivityAt: row.lastActivityAt,
      })),
      messages: this.queries.searchMessages(text, filters, MAX_MESSAGES).map((row) => ({
        sessionId: row.sessionId,
        sessionTitle: title(row),
        projectName: row.projectName,
        seq: row.seq,
        role: row.role,
        snippet: row.snippet,
        occurredAt: row.occurredAt,
      })),
    }
  }
}
