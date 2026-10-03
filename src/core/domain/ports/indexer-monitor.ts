import type { IndexerStatus } from '../indexer/indexer-status'

/** État courant du processus d'indexation. */
export interface IndexerMonitor {
  currentStatus(): IndexerStatus
}
