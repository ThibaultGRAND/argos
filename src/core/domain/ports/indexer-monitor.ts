import type { IndexerState } from '../indexer/indexer-status'

/** État courant du processus d'indexation. */
export interface IndexerMonitor {
  currentState(): IndexerState
}
