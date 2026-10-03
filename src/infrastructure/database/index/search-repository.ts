import { sql, type SQL } from 'drizzle-orm'
import type { MessageHitRow, SearchQueries, SessionHitRow } from '../../../core/domain/ports/search-queries'
import { HIGHLIGHT_END, HIGHLIGHT_START, type SearchFilters } from '../../../core/domain/search/search'
import type { IndexDatabase } from './index-database'

const SNIPPET_TOKENS = 18

/**
 * Convertit une saisie libre en requête FTS5 sûre : chaque mot entre guillemets (aucun opérateur interprété),
 * le dernier mot cherché comme un début de mot, mots reliés par ET.
 */
export function toFtsQuery(text: string): string | undefined {
  const words = text
    .split(/\s+/)
    .map((word) => word.replace(/"/g, ''))
    .filter((word) => word !== '')
  if (words.length === 0) return undefined
  return words.map((word, index) => (index === words.length - 1 ? `"${word}"*` : `"${word}"`)).join(' ')
}

/** Échappe `%`, `_` et `\` pour une recherche `LIKE … ESCAPE '\'`. */
const likePattern = (text: string): string => `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`

function filterClause(filters: SearchFilters, activityColumn: SQL): SQL {
  const clauses: SQL[] = []
  if (filters.projectId !== undefined) clauses.push(sql`s.project_id = ${filters.projectId}`)
  if (filters.since !== undefined) clauses.push(sql`${activityColumn} >= ${filters.since}`)
  return clauses.length === 0 ? sql`` : sql` and ${sql.join(clauses, sql` and `)}`
}

/** Recherche plein texte dans index.db (FTS5 sur les messages, titres par `LIKE`). */
export class SqliteSearchQueries implements SearchQueries {
  constructor(private readonly database: IndexDatabase) {}

  searchSessions(text: string, filters: SearchFilters, limit: number): readonly SessionHitRow[] {
    const pattern = likePattern(text)
    return this.database.all<SessionHitRow>(sql`
      select s.id as sessionId, s.custom_title as customTitle, s.ai_title as generatedTitle,
             s.first_prompt as firstPrompt, p.name as projectName, s.last_activity_at as lastActivityAt
      from sessions s join projects p on p.id = s.project_id
      where (s.custom_title like ${pattern} escape '\\' or s.ai_title like ${pattern} escape '\\'
             or s.first_prompt like ${pattern} escape '\\')
        ${filterClause(filters, sql`s.last_activity_at`)}
      order by s.last_activity_at desc
      limit ${limit}
    `)
  }

  searchMessages(text: string, filters: SearchFilters, limit: number): readonly MessageHitRow[] {
    const match = toFtsQuery(text)
    if (match === undefined) return []
    return this.database.all<MessageHitRow>(sql`
      select m.session_id as sessionId, s.custom_title as customTitle, s.ai_title as generatedTitle,
             s.first_prompt as firstPrompt, p.name as projectName, m.seq as seq, m.role as role,
             snippet(messages_fts, 0, ${HIGHLIGHT_START}, ${HIGHLIGHT_END}, '…', ${SNIPPET_TOKENS}) as snippet,
             m.occurred_at as occurredAt
      from messages_fts
      join messages m on m.id = messages_fts.rowid
      join sessions s on s.id = m.session_id
      join projects p on p.id = s.project_id
      where messages_fts match ${match}
        ${filterClause(filters, sql`m.occurred_at`)}
      order by bm25(messages_fts)
      limit ${limit}
    `)
  }
}
