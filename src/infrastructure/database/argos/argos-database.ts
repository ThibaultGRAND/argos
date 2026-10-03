import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { openSqlite, type SqliteConnection } from '../connection'
import { runMigrations } from '../migrations'
import * as schema from './schema'

export type ArgosDatabase = BetterSQLite3Database<typeof schema>

export interface ArgosDatabaseHandle {
  readonly database: ArgosDatabase
  close(): void
}

export interface ArgosDatabaseOptions {
  readonly path: string
  readonly migrationsFolder: string
  readonly backupDirectory: string
}

/** Ouvre argos.db, applique les migrations en attente après une copie de sécurité. */
export function openArgosDatabase(options: ArgosDatabaseOptions): ArgosDatabaseHandle {
  const connection: SqliteConnection = openSqlite(options.path)
  const database = drizzle(connection, { schema })
  runMigrations(connection, database, {
    migrationsFolder: options.migrationsFolder,
    backup: { directory: options.backupDirectory, baseName: 'argos' },
  })
  return { database, close: () => connection.close() }
}
