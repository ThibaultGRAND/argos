export const searchPeriods = ['all', 'week', 'month', 'year'] as const
export type SearchPeriod = (typeof searchPeriods)[number]

const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 200

/** Saisie de recherche nettoyée, ou `undefined` si elle est trop courte pour lancer une recherche. */
export function normalizeSearchText(raw: string): string | undefined {
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH)
  return text.length >= MIN_QUERY_LENGTH ? text : undefined
}

const periodDays: Readonly<Record<Exclude<SearchPeriod, 'all'>, number>> = { week: 7, month: 30, year: 365 }

/** Date de début d'une période (ISO 8601), ou `undefined` pour « tout ». */
export function periodStart(period: SearchPeriod, now: Date): string | undefined {
  if (period === 'all') return undefined
  return new Date(now.getTime() - periodDays[period] * 24 * 60 * 60 * 1000).toISOString()
}

export interface SearchFilters {
  readonly projectId?: number
  /** Ne garde que l'activité postérieure à cette date (ISO 8601). */
  readonly since?: string
}

export interface SessionHit {
  readonly sessionId: number
  readonly title: string | null
  readonly projectName: string
  readonly lastActivityAt: string
}

/** Extrait avec les passages trouvés délimités par `HIGHLIGHT_START` et `HIGHLIGHT_END`. */
export interface MessageHit {
  readonly sessionId: number
  readonly sessionTitle: string | null
  readonly projectName: string
  readonly seq: number
  readonly role: 'user' | 'assistant'
  readonly snippet: string
  readonly occurredAt: string
}

/** Marqueurs de surlignage dans les extraits : caractères de contrôle, jamais du HTML. */
export const HIGHLIGHT_START = '\u0002'
export const HIGHLIGHT_END = '\u0003'

export interface SearchResults {
  readonly sessions: readonly SessionHit[]
  readonly messages: readonly MessageHit[]
}
