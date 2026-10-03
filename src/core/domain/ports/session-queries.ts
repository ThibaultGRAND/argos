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

export interface SessionDetailRow extends SessionRow {
  readonly projectId: number
  readonly projectName: string
  readonly projectPath: string
  readonly gitBranch: string | null
  readonly cliVersion: string | null
  readonly toolCallCount: number
}

export interface SessionFileRow {
  readonly path: string
  readonly linesAdded: number
  readonly linesRemoved: number
  readonly changes: number
}

export interface MessageRow {
  readonly kind: 'message'
  readonly seq: number
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly occurredAt: string
}

export interface ToolCallRow {
  readonly kind: 'tool'
  readonly seq: number
  readonly toolName: string
  readonly toolKind: string
  readonly target: string | null
  readonly summary: string | null
  readonly status: 'pending' | 'success' | 'error'
  readonly linesAdded: number
  readonly linesRemoved: number
  readonly occurredAt: string
}

/** Lecture de l'index pour l'interface (processus principal, lecture seule). */
export interface SessionQueries {
  listProjects(): readonly ProjectRow[]
  listSessions(projectId: number, query: string | undefined, limit: number): readonly SessionRow[]
  getSession(sessionId: number): SessionDetailRow | undefined
  listSessionFiles(sessionId: number): readonly SessionFileRow[]
  /** Messages et appels d'outils de `seq` strictement supérieur à `afterSeq`, dans l'ordre, au plus `limit`. */
  listEntries(sessionId: number, afterSeq: number, limit: number): readonly (MessageRow | ToolCallRow)[]
}
