import type {
  MessageRow,
  ProjectRow,
  SessionDetailRow,
  SessionFileRow,
  SessionQueries,
  SessionRow,
  ToolCallRow,
} from '../../../core/domain/ports/session-queries'
import { openIndexDatabaseReadOnly, type IndexDatabaseHandle } from './index-database'
import { SqliteSessionQueries } from './session-queries-repository'

/**
 * Lecture de index.db par le processus principal, ouverte au premier besoin :
 * tant que l'indexeur n'a pas créé la base, les listes sont vides.
 */
export class ReadOnlySessionQueries implements SessionQueries {
  private handle: IndexDatabaseHandle | undefined
  private queries: SqliteSessionQueries | undefined

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

  close(): void {
    this.handle?.close()
    this.handle = undefined
    this.queries = undefined
  }

  private open(): SqliteSessionQueries | undefined {
    if (this.queries !== undefined) return this.queries
    this.handle = openIndexDatabaseReadOnly(this.indexDbPath)
    if (this.handle === undefined) return undefined
    this.queries = new SqliteSessionQueries(this.handle.database)
    return this.queries
  }
}
