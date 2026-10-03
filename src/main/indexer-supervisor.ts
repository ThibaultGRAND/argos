import { join } from 'node:path'
import { utilityProcess, type UtilityProcess } from 'electron'
import type { IndexerState } from '../core/domain/indexer/indexer-status'
import type { IndexerMonitor } from '../core/domain/ports/indexer-monitor'
import { IndexerToMainSchema, type MainToIndexerMessage } from '../shared/contract'

const MAX_RESTART_DELAY_MS = 30_000

/**
 * Lance l'indexeur dans un utilityProcess, le relance avec un délai croissant s'il s'arrête,
 * et expose son état (PLAN.md §2.3, flux A).
 */
export class IndexerSupervisor implements IndexerMonitor {
  private child: UtilityProcess | undefined
  private state: IndexerState = 'starting'
  private restartDelayMs = 1_000
  private stopping = false

  constructor(
    private readonly indexDbPath: string,
    private readonly onStateChange: (state: IndexerState) => void,
    private readonly log: (message: string) => void,
  ) {}

  currentState(): IndexerState {
    return this.state
  }

  start(): void {
    this.stopping = false
    this.setState('starting')
    const child = utilityProcess.fork(join(__dirname, 'indexer.js'), [], { serviceName: 'argos-indexer' })
    this.child = child

    child.on('message', (raw: unknown) => {
      const parsed = IndexerToMainSchema.safeParse(raw)
      if (!parsed.success) {
        this.log('Message invalide reçu de l’indexeur')
        return
      }
      const message = parsed.data
      switch (message.type) {
        case 'ready':
          this.restartDelayMs = 1_000
          this.setState('ready')
          this.send({ type: 'ping' })
          break
        case 'pong':
          this.log('Indexeur : pong reçu')
          break
        case 'error':
          this.log(`Indexeur : erreur ${message.code}`)
          this.setState('error')
          break
      }
    })

    child.on('exit', (code) => {
      this.child = undefined
      if (this.stopping) return
      this.log(`Indexeur arrêté (code ${code}), relance dans ${this.restartDelayMs} ms`)
      this.setState('error')
      setTimeout(() => this.start(), this.restartDelayMs)
      this.restartDelayMs = Math.min(this.restartDelayMs * 2, MAX_RESTART_DELAY_MS)
    })

    this.send({ type: 'init', indexDbPath: this.indexDbPath })
  }

  stop(): void {
    this.stopping = true
    this.child?.kill()
  }

  private send(message: MainToIndexerMessage): void {
    this.child?.postMessage(message)
  }

  private setState(state: IndexerState): void {
    if (this.state === state) return
    this.state = state
    this.onStateChange(state)
  }
}
