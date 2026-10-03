import { existsSync } from 'node:fs'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { openSqlite, openSqliteReadOnly } from '../connection'
import { runMigrations } from '../migrations'
import * as schema from './schema'

/**
 * index.db — index reconstructible (PLAN.md §2.4).
 * L'indexeur l'ouvre en écriture et applique les migrations ; le principal l'ouvre en lecture seule.
 */
export type IndexDatabase = BetterSQLite3Database<typeof schema>

export interface IndexDatabaseHandle {
  readonly database: IndexDatabase
  close(): void
}

export function openIndexDatabase(path: string, migrationsFolder: string): IndexDatabaseHandle {
  const connection = openSqlite(path)
  const database = drizzle(connection, { schema })
  // Pas de copie avant migration : l'index se reconstruit en réimportant.
  runMigrations(connection, database, { migrationsFolder })
  return { database, close: () => connection.close() }
}

/** Renvoie `undefined` tant que l'indexeur n'a pas encore créé la base. */
export function openIndexDatabaseReadOnly(path: string): IndexDatabaseHandle | undefined {
  if (!existsSync(path)) return undefined
  const connection = openSqliteReadOnly(path)
  return { database: drizzle(connection, { schema }), close: () => connection.close() }
}
