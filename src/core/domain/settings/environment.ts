import type { ProviderId } from '../history/provider'

/** État d'une source d'historique : lue, absente de la machine, ou prévue pour une version future. */
export type SourceStatus = 'available' | 'missing' | 'planned'

export interface SourceInfo {
  readonly providerId: ProviderId
  readonly status: SourceStatus
  readonly directory: string | null
  readonly sessionCount: number
}

export interface Environment {
  readonly dataDirectory: string
  readonly sources: readonly SourceInfo[]
}
