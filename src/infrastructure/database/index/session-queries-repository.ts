import { and, count, desc, eq, max, or, sql, type SQLWrapper } from 'drizzle-orm'
import { providerIds, type ProviderId } from '../../../core/domain/history/provider'
import type { ProjectRow, SessionQueries, SessionRow } from '../../../core/domain/ports/session-queries'
import type { IndexDatabase } from './index-database'
import { projects, sessions } from './schema'

/** `LIKE` insensible à la casse, avec les caractères spéciaux échappés. */
const contains = (column: SQLWrapper, pattern: string) => sql`${column} like ${pattern} escape '\\'`

const isProviderId = (value: string): value is ProviderId => providerIds.some((id) => id === value)

/** Lecture de l'index pour l'interface, depuis le processus principal (lecture seule). */
export class SqliteSessionQueries implements SessionQueries {
  constructor(private readonly database: IndexDatabase) {}

  listProjects(): readonly ProjectRow[] {
    return this.database
      .select({
        id: projects.id,
        name: projects.name,
        path: projects.path,
        sessionCount: count(sessions.id),
        lastActivityAt: max(sessions.lastActivityAt),
      })
      .from(projects)
      .innerJoin(sessions, eq(sessions.projectId, projects.id))
      .groupBy(projects.id)
      .orderBy(desc(max(sessions.lastActivityAt)))
      .all()
      .map((row) => ({ ...row, lastActivityAt: row.lastActivityAt ?? '' }))
  }

  listSessions(projectId: number, query: string | undefined, limit: number): readonly SessionRow[] {
    const pattern = query === undefined ? undefined : `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
    const filter =
      pattern === undefined
        ? eq(sessions.projectId, projectId)
        : and(
            eq(sessions.projectId, projectId),
            or(
              contains(sessions.customTitle, pattern),
              contains(sessions.aiTitle, pattern),
              contains(sessions.firstPrompt, pattern),
            ),
          )
    return this.database
      .select({
        id: sessions.id,
        providerId: sessions.providerId,
        externalId: sessions.externalId,
        customTitle: sessions.customTitle,
        generatedTitle: sessions.aiTitle,
        firstPrompt: sessions.firstPrompt,
        lastExcerpt: sessions.lastExcerpt,
        model: sessions.model,
        startedAt: sessions.startedAt,
        lastActivityAt: sessions.lastActivityAt,
        messageCount: sessions.messageCount,
        filesChanged: sessions.filesChanged,
        linesAdded: sessions.linesAdded,
        linesRemoved: sessions.linesRemoved,
      })
      .from(sessions)
      .where(filter)
      .orderBy(desc(sessions.lastActivityAt))
      .limit(limit)
      .all()
      .flatMap((row) => (isProviderId(row.providerId) ? [{ ...row, providerId: row.providerId }] : []))
  }
}
