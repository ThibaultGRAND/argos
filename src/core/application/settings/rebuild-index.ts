import type { IndexerControl } from '../../domain/ports/indexer-control'

/** Reconstruit l'index à partir des fichiers des CLI (F16). */
export class RebuildIndex {
  constructor(private readonly indexer: IndexerControl) {}

  execute(): void {
    this.indexer.requestRebuild()
  }
}
