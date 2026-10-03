import { join } from 'node:path'
import { utilityProcess, type UtilityProcess } from 'electron'
import type { IndexerStatus } from '../core/domain/indexer/indexer-status'
import type { IndexerMonitor } from '../core/domain/ports/indexer-monitor'
import { IndexerToMainSchema, type MainToIndexerMessage } from '../shared/contract'

const MAX_RESTART_DELAY_MS = 30_000

/** Erreurs qui rendent l'indexeur inutilisable ; les autres (surveillance du dossier…) sont seulement journalisées. */
const blockingErrors = new Set(['index_db_open_failed', 'import_failed'])

export interface IndexerCallbacks {
  readonly onStatusChange: (status: IndexerStatus) => void
  readonly onIndexUpdated: (sessionsChanged: number) => void
  readonly log: (message: string) => void
}

/**
 * Lance l'indexeur dans un utilityProcess, le relance avec un délai croissant s'il s'arrête,
 * et expose son état (PLAN.md §2.3, flux A).
 */
export class IndexerSupervisor implements IndexerMonitor {
  private child: UtilityProcess | undefined
  private status: IndexerStatus = { state: 'starting' }
  private restartDelayMs = 1_000
  private stopping = false

  constructor(
    private readonly indexDbPath: string,
    private readonly migrationsFolder: string,
    private readonly callbacks: IndexerCallbacks,
  ) {}

  currentStatus(): IndexerStatus {
    return this.status
  }

  start(): void {
    this.stopping = false
    this.setStatus({ state: 'starting' })
    const child = utilityProcess.fork(join(__dirname, 'indexer.js'), [], { serviceName: 'argos-indexer' })
    this.child = child

    child.on('message', (raw: unknown) => {
      const parsed = IndexerToMainSchema.safeParse(raw)
      if (!parsed.success) {
        this.callbacks.log('Message invalide reçu de l’indexeur')
        return
      }
      const message = parsed.data
      switch (message.type) {
        case 'ready':
          this.restartDelayMs = 1_000
          this.setStatus({ state: 'ready' })
          break
        case 'pong':
          this.callbacks.log('Indexeur : pong reçu')
          break
        case 'progress':
          this.setStatus({ state: 'importing', progress: message.progress })
          break
        case 'imported':
          this.callbacks.log(
            `Import : ${message.filesRead} fichiers lus, ${message.sessionsChanged} sessions modifiées, ` +
              `${message.skippedLines} lignes ignorées, ${message.failures} échecs`,
          )
          this.setStatus({ state: 'ready' })
          if (message.sessionsChanged > 0) this.callbacks.onIndexUpdated(message.sessionsChanged)
          break
        case 'error':
          this.callbacks.log(`Indexeur : erreur ${message.code} (${message.message})`)
          if (blockingErrors.has(message.code)) this.setStatus({ state: 'error' })
          break
      }
    })

    child.on('exit', (code) => {
      this.child = undefined
      if (this.stopping) return
      this.callbacks.log(`Indexeur arrêté (code ${code}), relance dans ${this.restartDelayMs} ms`)
      this.setStatus({ state: 'error' })
      setTimeout(() => this.start(), this.restartDelayMs)
      this.restartDelayMs = Math.min(this.restartDelayMs * 2, MAX_RESTART_DELAY_MS)
    })

    this.send({ type: 'init', indexDbPath: this.indexDbPath, migrationsFolder: this.migrationsFolder })
  }

  /** Demande un passage d'import incrémental (par exemple quand l'app revient au premier plan). */
  requestImport(): void {
    this.send({ type: 'import' })
  }

  stop(): void {
    this.stopping = true
    this.child?.kill()
  }

  private send(message: MainToIndexerMessage): void {
    this.child?.postMessage(message)
  }

  private setStatus(status: IndexerStatus): void {
    this.status = status
    this.callbacks.onStatusChange(status)
  }
}
