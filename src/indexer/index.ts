import { openIndexDatabase, type IndexDatabaseHandle } from '../infrastructure/database/index/index-database'
import { MainToIndexerSchema, type IndexerToMainMessage } from '../shared/contract'

/**
 * Processus d'indexation (utilityProcess). Lira et indexera les JSONL des CLI à partir de F01.
 * Dans le socle : ouvre index.db et répond aux messages de test.
 */
const port = process.parentPort
let database: IndexDatabaseHandle | undefined

const send = (message: IndexerToMainMessage): void => port.postMessage(message)

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
        database = openIndexDatabase(message.indexDbPath)
        send({ type: 'ready' })
      } catch (error) {
        send({
          type: 'error',
          code: 'index_db_open_failed',
          message: error instanceof Error ? error.message : String(error),
        })
      }
      break
    case 'ping':
      send({ type: 'pong' })
      break
  }
})

process.on('exit', () => database?.close())
