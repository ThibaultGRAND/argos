import type { IndexerState } from '../../domain/indexer/indexer-status'
import type { IndexerMonitor } from '../../domain/ports/indexer-monitor'

export class GetIndexerStatus {
  constructor(private readonly monitor: IndexerMonitor) {}

  execute(): IndexerState {
    return this.monitor.currentState()
  }
}
