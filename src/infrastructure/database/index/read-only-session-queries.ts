import type {
  MessageRow,
  ProjectRow,
  SessionDetailRow,
  SessionFileRow,
  SessionQueries,
  SessionRow,
  ToolCallRow,
} from '../../../core/domain/ports/session-queries'
import type { MessageHitRow, SearchQueries, SessionHitRow } from '../../../core/domain/ports/search-queries'
import type { SearchFilters } from '../../../core/domain/search/search'
import type { ProviderId } from '../../../core/domain/history/provider'
import { openIndexDatabaseReadOnly, type IndexDatabaseHandle } from './index-database'
import { SqliteSearchQueries } from './search-repository'
import { SqliteSessionQueries } from './session-queries-repository'

/**
 * Lecture de index.db par le processus principal, ouverte au premier besoin :
 * tant que l'indexeur n'a pas créé la base, les listes sont vides.
 */
export class ReadOnlySessionQueries implements SessionQueries, SearchQueries {
  private handle: IndexDatabaseHandle | undefined
  private queries: SqliteSessionQueries | undefined
  private search: SqliteSearchQueries | undefined

  constructor(private readonly indexDbPath: string) {}

  listProjects(): readonly ProjectRow[] {
    return this.open()?.listProjects() ?? []
  }

  listSessions(projectId: number, query: string | undefined, limit: number): readonly SessionRow[] {
    return this.open()?.listSessions(projectId, query, limit) ?? []
  }

  getSession(sessionId: number): SessionDetailRow | undefined {
    return this.open()?.getSession(sessionId)
  }

  listSessionFiles(sessionId: number): readonly SessionFileRow[] {
    return this.open()?.listSessionFiles(sessionId) ?? []
  }

  listEntries(sessionId: number, afterSeq: number, limit: number): readonly (MessageRow | ToolCallRow)[] {
    return this.open()?.listEntries(sessionId, afterSeq, limit) ?? []
  }

  isKnownPath(path: string): boolean {
    return this.open()?.isKnownPath(path) ?? false
  }

  countSessions(providerId: ProviderId): number {
    return this.open()?.countSessions(providerId) ?? 0
  }

  searchSessions(text: string, filters: SearchFilters, limit: number): readonly SessionHitRow[] {
    return this.open() === undefined ? [] : (this.search?.searchSessions(text, filters, limit) ?? [])
  }

  searchMessages(text: string, filters: SearchFilters, limit: number): readonly MessageHitRow[] {
    return this.open() === undefined ? [] : (this.search?.searchMessages(text, filters, limit) ?? [])
  }

  close(): void {
    this.handle?.close()
    this.handle = undefined
    this.queries = undefined
    this.search = undefined
  }

  private open(): SqliteSessionQueries | undefined {
    if (this.queries !== undefined) return this.queries
    this.handle = openIndexDatabaseReadOnly(this.indexDbPath)
    if (this.handle === undefined) return undefined
    this.queries = new SqliteSessionQueries(this.handle.database)
    this.search = new SqliteSearchQueries(this.handle.database)
    return this.queries
  }
}
