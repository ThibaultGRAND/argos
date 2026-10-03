import type { ProjectRow, SessionQueries, SessionRow } from '../../../core/domain/ports/session-queries'
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
