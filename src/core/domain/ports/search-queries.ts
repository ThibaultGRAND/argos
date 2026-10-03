import type { SearchFilters } from '../search/search'

export interface SessionHitRow {
  readonly sessionId: number
  readonly customTitle: string | null
  readonly generatedTitle: string | null
  readonly firstPrompt: string | null
  readonly projectName: string
  readonly lastActivityAt: string
}

export interface MessageHitRow {
  readonly sessionId: number
  readonly customTitle: string | null
  readonly generatedTitle: string | null
  readonly firstPrompt: string | null
  readonly projectName: string
  readonly seq: number
  readonly role: 'user' | 'assistant'
  readonly snippet: string
  readonly occurredAt: string
}

/** Recherche dans l'index (processus principal, lecture seule). */
export interface SearchQueries {
  searchSessions(text: string, filters: SearchFilters, limit: number): readonly SessionHitRow[]
  searchMessages(text: string, filters: SearchFilters, limit: number): readonly MessageHitRow[]
}
