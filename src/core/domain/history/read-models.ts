import type { ProviderId } from './provider'

/** Projet tel que lu depuis l'index, pour l'interface. */
export interface ProjectSummary {
  readonly id: number
  readonly name: string
  readonly path: string
  readonly sessionCount: number
  readonly lastActivityAt: string
}

/** Session telle que lue depuis l'index, avec son titre déjà résolu. */
export interface SessionSummary {
  readonly id: number
  readonly providerId: ProviderId
  readonly externalId: string
  readonly title: string | null
  readonly excerpt: string | null
  readonly model: string | null
  readonly startedAt: string
  readonly lastActivityAt: string
  readonly messageCount: number
  readonly filesChanged: number
  readonly linesAdded: number
  readonly linesRemoved: number
}
