import { and, asc, count, desc, eq, gt, max, or, sql, sum, type SQLWrapper } from 'drizzle-orm'
import { providerIds, type ProviderId } from '../../../core/domain/history/provider'
import type {
  MessageRow,
  ProjectRow,
  SessionDetailRow,
  SessionFileRow,
  SessionQueries,
  SessionRow,
  ToolCallRow,
} from '../../../core/domain/ports/session-queries'
import type { IndexDatabase } from './index-database'
import { fileChanges, messages, projects, sessions, toolCalls } from './schema'

/** `LIKE` insensible à la casse, avec les caractères spéciaux échappés. */
const contains = (column: SQLWrapper, pattern: string) => sql`${column} like ${pattern} escape '\\'`

const isProviderId = (value: string): value is ProviderId => providerIds.some((id) => id === value)

const toolStatuses = ['pending', 'success', 'error'] as const
const asToolStatus = (value: string): ToolCallRow['status'] =>
  toolStatuses.find((status) => status === value) ?? 'pending'

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

  getSession(sessionId: number): SessionDetailRow | undefined {
    const row = this.database
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
        gitBranch: sessions.gitBranch,
        cliVersion: sessions.cliVersion,
        toolCallCount: sessions.toolCallCount,
        contextTokens: sessions.contextTokens,
        inputTokens: sessions.inputTokens,
        outputTokens: sessions.outputTokens,
        cacheReadTokens: sessions.cacheReadTokens,
        cacheCreationTokens: sessions.cacheCreationTokens,
        projectId: sessions.projectId,
        projectName: projects.name,
        projectPath: projects.path,
      })
      .from(sessions)
      .innerJoin(projects, eq(projects.id, sessions.projectId))
      .where(eq(sessions.id, sessionId))
      .get()
    if (row === undefined || !isProviderId(row.providerId)) return undefined
    return { ...row, providerId: row.providerId }
  }

  listSessionFiles(sessionId: number): readonly SessionFileRow[] {
    return this.database
      .select({
        path: fileChanges.path,
        linesAdded: sum(fileChanges.linesAdded).mapWith(Number),
        linesRemoved: sum(fileChanges.linesRemoved).mapWith(Number),
        changes: count(fileChanges.id),
      })
      .from(fileChanges)
      .innerJoin(toolCalls, eq(toolCalls.id, fileChanges.toolCallId))
      .where(eq(toolCalls.sessionId, sessionId))
      .groupBy(fileChanges.path)
      .orderBy(asc(fileChanges.path))
      .all()
  }

  isKnownPath(path: string): boolean {
    // Un projet à la racine du disque (« / », « C:\ ») ne rend pas tout le disque accessible.
    const row = this.database.get<{ known: number }>(sql`
      select exists(
        select 1 from projects
        where length(path) > 3
          and (${path} = path or substr(${path}, 1, length(path) + 1) in (path || '/', path || '\'))
      ) or exists(select 1 from file_changes where path = ${path}) as known
    `)
    return row?.known === 1
  }

  getProject(projectId: number): ProjectRow | undefined {
    return this.listProjects().find((project) => project.id === projectId)
  }

  findSessionIdByExternal(externalId: string): number | undefined {
    return this.database.select({ id: sessions.id }).from(sessions).where(eq(sessions.externalId, externalId)).get()?.id
  }

  countSessions(providerId: ProviderId): number {
    return (
      this.database.select({ count: count() }).from(sessions).where(eq(sessions.providerId, providerId)).get()?.count ??
      0
    )
  }

  listEntries(sessionId: number, afterSeq: number, limit: number): readonly (MessageRow | ToolCallRow)[] {
    const messageRows: MessageRow[] = this.database
      .select({ seq: messages.seq, role: messages.role, text: messages.text, occurredAt: messages.occurredAt })
      .from(messages)
      .where(and(eq(messages.sessionId, sessionId), gt(messages.seq, afterSeq)))
      .orderBy(asc(messages.seq))
      .limit(limit)
      .all()
      .map((row) => ({ kind: 'message', ...row }))

    const toolRows: ToolCallRow[] = this.database
      .select({
        seq: toolCalls.seq,
        toolName: toolCalls.toolName,
        toolKind: toolCalls.kind,
        target: toolCalls.target,
        summary: toolCalls.summary,
        status: toolCalls.status,
        occurredAt: toolCalls.occurredAt,
        linesAdded: sql<number>`coalesce(sum(${fileChanges.linesAdded}), 0)`,
        linesRemoved: sql<number>`coalesce(sum(${fileChanges.linesRemoved}), 0)`,
      })
      .from(toolCalls)
      .leftJoin(fileChanges, eq(fileChanges.toolCallId, toolCalls.id))
      .where(and(eq(toolCalls.sessionId, sessionId), gt(toolCalls.seq, afterSeq)))
      .groupBy(toolCalls.id)
      .orderBy(asc(toolCalls.seq))
      .limit(limit)
      .all()
      .map((row) => ({ kind: 'tool', ...row, status: asToolStatus(row.status) }))

    // Les deux listes sont triées : leur fusion contient les `limit` premières entrées de la session.
    return [...messageRows, ...toolRows].sort((a, b) => a.seq - b.seq).slice(0, limit)
  }
}
