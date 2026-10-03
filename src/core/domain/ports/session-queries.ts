import type { ProviderId } from '../history/provider'

/** Ligne brute d'une session lue dans l'index ; le titre est résolu par le domaine. */
export interface SessionRow {
  readonly id: number
  readonly providerId: ProviderId
  readonly externalId: string
  readonly customTitle: string | null
  readonly generatedTitle: string | null
  readonly firstPrompt: string | null
  readonly lastExcerpt: string | null
  readonly model: string | null
  readonly startedAt: string
  readonly lastActivityAt: string
  readonly messageCount: number
  readonly filesChanged: number
  readonly linesAdded: number
  readonly linesRemoved: number
}

export interface ProjectRow {
  readonly id: number
  readonly name: string
  readonly path: string
  readonly sessionCount: number
  readonly lastActivityAt: string
}

/** Lecture de l'index pour l'interface (processus principal, lecture seule). */
export interface SessionQueries {
  listProjects(): readonly ProjectRow[]
  listSessions(projectId: number, query: string | undefined, limit: number): readonly SessionRow[]
}
