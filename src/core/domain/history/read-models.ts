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

/** Fichier modifié pendant une session, avec le total de ses modifications. */
export interface SessionFile {
  readonly path: string
  readonly linesAdded: number
  readonly linesRemoved: number
  readonly changes: number
}

/** Fiche complète d'une session, pour le compte rendu (F02). */
export interface SessionDetail extends SessionSummary {
  readonly projectId: number
  readonly projectName: string
  readonly projectPath: string
  readonly gitBranch: string | null
  readonly cliVersion: string | null
  readonly toolCallCount: number
  readonly files: readonly SessionFile[]
}

export interface MessageEntry {
  readonly kind: 'message'
  readonly seq: number
  readonly role: 'user' | 'assistant'
  readonly text: string
  /** Vrai si le texte a été raccourci pour l'affichage. */
  readonly truncated: boolean
  readonly occurredAt: string
}

export interface ToolEntry {
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

/** Entrée du compte rendu : message ou appel d'outil, dans l'ordre réel de la session. */
export type TimelineEntry = MessageEntry | ToolEntry

export interface TimelinePage {
  readonly entries: readonly TimelineEntry[]
  /** `seq` à partir duquel charger la page suivante, ou `null` si tout est chargé. */
  readonly nextSeq: number | null
}
