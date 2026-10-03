import Database from 'better-sqlite3'

export type SqliteConnection = Database.Database

/**
 * Ouvre une base SQLite avec les réglages communs d'Argos :
 * WAL (lecteurs et écrivain simultanés), clés étrangères actives, délai d'attente sur verrou.
 */
export function openSqlite(path: string): SqliteConnection {
  const connection = new Database(path)
  connection.pragma('journal_mode = WAL')
  connection.pragma('foreign_keys = ON')
  connection.pragma('busy_timeout = 5000')
  connection.pragma('synchronous = NORMAL')
  return connection
}

/** Ouvre une base existante en lecture seule (le processus principal lit index.db sans jamais l'écrire). */
export function openSqliteReadOnly(path: string): SqliteConnection {
  const connection = new Database(path, { readonly: true, fileMustExist: true })
  connection.pragma('busy_timeout = 5000')
  return connection
}
