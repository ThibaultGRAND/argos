import { openSqlite, type SqliteConnection } from '../connection'

/**
 * index.db — index reconstructible, écrit par l'indexeur seul (PLAN.md §2.4).
 * Ses tables et sa série de migrations arrivent avec F01.
 */
export interface IndexDatabaseHandle {
  readonly connection: SqliteConnection
  close(): void
}

export function openIndexDatabase(path: string): IndexDatabaseHandle {
  const connection = openSqlite(path)
  return { connection, close: () => connection.close() }
}
