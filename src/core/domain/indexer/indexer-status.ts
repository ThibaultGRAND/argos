export type IndexerState = 'starting' | 'importing' | 'ready' | 'error'

export interface IndexerStatus {
  readonly state: IndexerState
  readonly progress?: { readonly done: number; readonly total: number }
}
