import { ImportHistory, type ImportReport } from '../core/application/history/import-history'
import { watchDirectory } from '../infrastructure/filesystem/directory-watcher'
import { SqliteHistoryIndex } from '../infrastructure/database/index/history-index-repository'
import { openIndexDatabase, type IndexDatabaseHandle } from '../infrastructure/database/index/index-database'
import { ClaudeHistorySource } from '../infrastructure/providers/claude/claude-history-source'
import { resolveClaudeProjectsDirectory } from '../infrastructure/system/claude-paths'
import { MainToIndexerSchema, type IndexerToMainMessage } from '../shared/contract'

/**
 * Processus d'indexation (utilityProcess) : importe l'historique des CLI dans index.db,
 * puis le tient à jour (surveillance du dossier, passage périodique, demandes du principal).
 */
const WATCH_DEBOUNCE_MS = 1_500
const PERIODIC_IMPORT_MS = 5 * 60 * 1_000

const port = process.parentPort
const send = (message: IndexerToMainMessage): void => port.postMessage(message)

let database: IndexDatabaseHandle | undefined
let importer: ImportHistory | undefined
let historyIndex: SqliteHistoryIndex | undefined
let rebuildRequested = false
let running = false
let pending = false

/** Lance un import ; si un import est déjà en cours, en programme un autre juste après. */
async function runImport(): Promise<void> {
  if (importer === undefined) return
  if (running) {
    pending = true
    return
  }
  running = true
  try {
    if (rebuildRequested) {
      rebuildRequested = false
      historyIndex?.clear()
    }
    let lastSent = 0
    const report: ImportReport = await importer.execute((progress) => {
      // Limite les messages : un tous les 10 fichiers, et le dernier.
      if (progress.done - lastSent >= 10 || progress.done === progress.total) {
        lastSent = progress.done
        send({ type: 'progress', progress })
      }
    })
    send({
      type: 'imported',
      filesRead: report.filesRead,
      sessionsChanged: report.sessionsChanged,
      skippedLines: report.skippedLines,
      failures: report.failures.length,
    })
  } catch (error) {
    send({ type: 'error', code: 'import_failed', message: error instanceof Error ? error.message : String(error) })
  } finally {
    running = false
    if (pending) {
      pending = false
      void runImport()
    }
  }
}

function start(indexDbPath: string, migrationsFolder: string): void {
  database = openIndexDatabase(indexDbPath, migrationsFolder)
  const claudeProjects = resolveClaudeProjectsDirectory()
  historyIndex = new SqliteHistoryIndex(database.database)
  importer = new ImportHistory([new ClaudeHistorySource(claudeProjects)], historyIndex)
  send({ type: 'ready' })

  void runImport()
  watchDirectory(
    claudeProjects,
    WATCH_DEBOUNCE_MS,
    () => void runImport(),
    (error) => send({ type: 'error', code: 'watch_failed', message: error.message }),
  )
  setInterval(() => void runImport(), PERIODIC_IMPORT_MS).unref()
}

port.on('message', (event) => {
  const parsed = MainToIndexerSchema.safeParse(event.data)
  if (!parsed.success) {
    send({ type: 'error', code: 'invalid_message', message: 'Message invalide' })
    return
  }
  const message = parsed.data
  switch (message.type) {
    case 'init':
      try {
        start(message.indexDbPath, message.migrationsFolder)
      } catch (error) {
        send({
          type: 'error',
          code: 'index_db_open_failed',
          message: error instanceof Error ? error.message : String(error),
        })
      }
      break
    case 'import':
      void runImport()
      break
    case 'rebuild':
      // Le vidage a lieu au début du prochain passage, jamais pendant un import en cours.
      rebuildRequested = true
      void runImport()
      break
    case 'ping':
      send({ type: 'pong' })
      break
  }
})

process.on('exit', () => database?.close())
