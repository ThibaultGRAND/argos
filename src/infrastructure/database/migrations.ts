import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { SqliteConnection } from './connection'

const KEPT_BACKUPS = 5

interface MigrationJournal {
  readonly entries: readonly unknown[]
}

function countDeclaredMigrations(migrationsFolder: string): number {
  const journal = JSON.parse(readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf8')) as MigrationJournal
  return journal.entries.length
}

function countAppliedMigrations(connection: SqliteConnection): number {
  const table = connection
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'")
    .get()
  if (table === undefined) return 0
  const row = connection.prepare('SELECT COUNT(*) AS count FROM __drizzle_migrations').get() as { count: number }
  return row.count
}

/** Copie la base (VACUUM INTO) et ne garde que les dernières copies. */
function backup(connection: SqliteConnection, backupDir: string, baseName: string): void {
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = join(backupDir, `${baseName}-${stamp}.db`)
  connection.prepare('VACUUM INTO ?').run(target)

  const backups = readdirSync(backupDir)
    .filter((file) => file.startsWith(`${baseName}-`) && file.endsWith('.db'))
    .sort()
  for (const old of backups.slice(0, Math.max(0, backups.length - KEPT_BACKUPS))) {
    rmSync(join(backupDir, old))
  }
}

export interface MigrationOptions {
  readonly migrationsFolder: string
  /** Si fourni, une copie de la base est faite avant d'appliquer de nouvelles migrations. */
  readonly backup?: { readonly directory: string; readonly baseName: string }
}

export function runMigrations<TSchema extends Record<string, unknown>>(
  connection: SqliteConnection,
  database: BetterSQLite3Database<TSchema>,
  options: MigrationOptions,
): void {
  if (!existsSync(join(options.migrationsFolder, 'meta', '_journal.json'))) return

  const applied = countAppliedMigrations(connection)
  const pending = countDeclaredMigrations(options.migrationsFolder) - applied
  if (pending <= 0) return

  // Une base neuve n'a rien à protéger : on ne sauvegarde qu'une base qui contient déjà des migrations.
  if (options.backup !== undefined && applied > 0) {
    backup(connection, options.backup.directory, options.backup.baseName)
  }
  migrate(database, { migrationsFolder: options.migrationsFolder })
}
