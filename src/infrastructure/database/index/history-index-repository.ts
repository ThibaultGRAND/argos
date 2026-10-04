import { basename } from 'node:path'
import { and, countDistinct, eq, sql } from 'drizzle-orm'
import type { HistoryEvent } from '../../../core/domain/history/events'
import type { ImportCursor, SourceFile } from '../../../core/domain/history/history-source'
import type { ProviderId } from '../../../core/domain/history/provider'
import { excerpt } from '../../../core/domain/history/session-title'
import { contextTokensOf } from '../../../core/domain/usage/usage'
import type { ApplyResult, HistoryIndex } from '../../../core/domain/ports/history-index'
import type { IndexDatabase } from './index-database'
import { fileChanges, importCursors, messages, projects, sessions, toolCalls } from './schema'

type Transaction = Parameters<Parameters<IndexDatabase['transaction']>[0]>[0]

const now = (): string => new Date().toISOString()

/** Écriture de l'index par l'indexeur : projection des événements normalisés en tables (features/session_import.md). */
export class SqliteHistoryIndex implements HistoryIndex {
  constructor(private readonly database: IndexDatabase) {}

  cursors(providerId: ProviderId): ReadonlyMap<string, ImportCursor> {
    const rows = this.database.select().from(importCursors).where(eq(importCursors.providerId, providerId)).all()
    return new Map(
      rows.map((row) => [
        row.sourcePath,
        {
          sourcePath: row.sourcePath,
          byteOffset: row.byteOffset,
          fileSize: row.fileSize,
          parserVersion: row.parserVersion,
        },
      ]),
    )
  }

  resetSource(file: SourceFile): void {
    this.database.transaction((tx) => {
      tx.delete(sessions)
        .where(and(eq(sessions.providerId, file.providerId), eq(sessions.externalId, file.sessionExternalId)))
        .run()
      tx.delete(importCursors).where(eq(importCursors.sourcePath, file.path)).run()
    })
  }

  clear(): void {
    this.database.transaction((tx) => {
      // Les suppressions en cascade et les triggers FTS5 vident aussi messages, appels d'outils et recherche.
      tx.delete(projects).run()
      tx.delete(importCursors).run()
    })
  }

  applyChunk(file: SourceFile, events: readonly HistoryEvent[], cursor: ImportCursor): ApplyResult {
    return this.database.transaction((tx) => new ChunkProjection(tx, file).apply(events, cursor))
  }
}

/** Applique les événements d'un bloc à une session, dans une transaction. */
class ChunkProjection {
  private sessionId: number | undefined
  private nextSeq: number
  private changed = false
  private orphanEvents = 0
  private lastActivityAt: string | undefined
  private messageDelta = 0
  private toolCallDelta = 0
  private linesAddedDelta = 0
  private linesRemovedDelta = 0
  private touchedFiles = false
  private lastUsageMessageId: string | null = null
  private contextTokens: number | undefined
  private inputDelta = 0
  private outputDelta = 0
  private cacheReadDelta = 0
  private cacheCreationDelta = 0

  constructor(
    private readonly tx: Transaction,
    private readonly file: SourceFile,
  ) {
    this.sessionId = tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.providerId, file.providerId), eq(sessions.externalId, file.sessionExternalId)))
      .get()?.id
    if (this.sessionId !== undefined) {
      this.lastUsageMessageId =
        tx.select({ id: sessions.lastUsageMessageId }).from(sessions).where(eq(sessions.id, this.sessionId)).get()
          ?.id ?? null
    }
    this.nextSeq =
      tx
        .select({ nextSeq: importCursors.nextSeq })
        .from(importCursors)
        .where(eq(importCursors.sourcePath, file.path))
        .get()?.nextSeq ?? 0
  }

  apply(events: readonly HistoryEvent[], cursor: ImportCursor): ApplyResult {
    for (const event of events) {
      if (event.type === 'session-observed') {
        this.observeSession(event.projectPath, event.occurredAt, event.cliVersion, event.gitBranch)
        continue
      }
      const sessionId = this.sessionId
      if (sessionId === undefined) {
        this.orphanEvents += 1
        continue
      }
      this.changed = true
      switch (event.type) {
        case 'title-changed':
          this.tx
            .update(sessions)
            .set(event.source === 'custom' ? { customTitle: event.title } : { aiTitle: event.title })
            .where(eq(sessions.id, sessionId))
            .run()
          break
        case 'user-message':
          this.insertMessage(sessionId, 'user', event.externalId, event.text, event.occurredAt)
          this.tx
            .update(sessions)
            .set({ firstPrompt: sql`coalesce(${sessions.firstPrompt}, ${excerpt(event.text)})` })
            .where(eq(sessions.id, sessionId))
            .run()
          break
        case 'assistant-message':
          this.insertMessage(sessionId, 'assistant', event.externalId, event.text, event.occurredAt)
          this.tx
            .update(sessions)
            .set({ lastExcerpt: excerpt(event.text), ...(event.model === undefined ? {} : { model: event.model }) })
            .where(eq(sessions.id, sessionId))
            .run()
          break
        case 'tool-call': {
          const inserted = this.tx
            .insert(toolCalls)
            .values({
              sessionId,
              externalId: event.externalId,
              seq: this.nextSeq,
              toolName: event.toolName,
              kind: event.kind,
              target: event.target ?? null,
              summary: event.summary ?? null,
              status: 'pending',
              occurredAt: event.occurredAt,
            })
            .onConflictDoNothing()
            .run()
          if (inserted.changes > 0) {
            this.nextSeq += 1
            this.toolCallDelta += 1
          }
          if (event.model !== undefined) {
            this.tx.update(sessions).set({ model: event.model }).where(eq(sessions.id, sessionId)).run()
          }
          this.touch(event.occurredAt)
          break
        }
        case 'tool-result': {
          const call = this.tx
            .select({ id: toolCalls.id })
            .from(toolCalls)
            .where(and(eq(toolCalls.sessionId, sessionId), eq(toolCalls.externalId, event.toolCallExternalId)))
            .get()
          if (call === undefined) {
            this.orphanEvents += 1
            break
          }
          this.tx
            .update(toolCalls)
            .set({ status: event.status, updatedAt: now() })
            .where(eq(toolCalls.id, call.id))
            .run()
          for (const change of event.fileChanges) {
            this.tx
              .insert(fileChanges)
              .values({
                toolCallId: call.id,
                path: change.path,
                linesAdded: change.linesAdded,
                linesRemoved: change.linesRemoved,
              })
              .run()
            this.linesAddedDelta += change.linesAdded
            this.linesRemovedDelta += change.linesRemoved
            this.touchedFiles = true
          }
          this.touch(event.occurredAt)
          break
        }
        case 'usage-reported':
          // Les lignes d'une même réponse se suivent et répètent la même consommation.
          if (event.messageId === this.lastUsageMessageId) break
          this.lastUsageMessageId = event.messageId
          this.inputDelta += event.inputTokens
          this.outputDelta += event.outputTokens
          this.cacheReadDelta += event.cacheReadTokens
          this.cacheCreationDelta += event.cacheCreationTokens
          if (!event.sidechain) this.contextTokens = contextTokensOf(event)
          break
      }
    }

    this.flushSession()
    this.saveCursor(cursor)
    return { sessionChanged: this.changed, orphanEvents: this.orphanEvents }
  }

  private observeSession(projectPath: string, occurredAt: string, cliVersion?: string, gitBranch?: string): void {
    if (this.sessionId !== undefined) return
    this.tx
      .insert(projects)
      .values({ path: projectPath, name: basename(projectPath) || projectPath })
      .onConflictDoNothing()
      .run()
    const project = this.tx.select({ id: projects.id }).from(projects).where(eq(projects.path, projectPath)).get()
    if (project === undefined) return
    const inserted = this.tx
      .insert(sessions)
      .values({
        providerId: this.file.providerId,
        externalId: this.file.sessionExternalId,
        projectId: project.id,
        cliVersion: cliVersion ?? null,
        gitBranch: gitBranch ?? null,
        startedAt: occurredAt,
        lastActivityAt: occurredAt,
      })
      .returning({ id: sessions.id })
      .get()
    this.sessionId = inserted.id
    this.changed = true
  }

  private insertMessage(
    sessionId: number,
    role: 'user' | 'assistant',
    externalId: string,
    text: string,
    occurredAt: string,
  ): void {
    this.tx.insert(messages).values({ sessionId, externalId, seq: this.nextSeq, role, text, occurredAt }).run()
    this.nextSeq += 1
    this.messageDelta += 1
    this.touch(occurredAt)
  }

  private touch(occurredAt: string): void {
    if (this.lastActivityAt === undefined || occurredAt > this.lastActivityAt) this.lastActivityAt = occurredAt
  }

  /** Met à jour les compteurs de la session en une seule requête. */
  private flushSession(): void {
    const sessionId = this.sessionId
    if (sessionId === undefined || !this.changed) return
    const filesChanged = this.touchedFiles
      ? (this.tx
          .select({ count: countDistinct(fileChanges.path) })
          .from(fileChanges)
          .innerJoin(toolCalls, eq(fileChanges.toolCallId, toolCalls.id))
          .where(eq(toolCalls.sessionId, sessionId))
          .get()?.count ?? 0)
      : undefined
    this.tx
      .update(sessions)
      .set({
        messageCount: sql`${sessions.messageCount} + ${this.messageDelta}`,
        toolCallCount: sql`${sessions.toolCallCount} + ${this.toolCallDelta}`,
        linesAdded: sql`${sessions.linesAdded} + ${this.linesAddedDelta}`,
        linesRemoved: sql`${sessions.linesRemoved} + ${this.linesRemovedDelta}`,
        ...(filesChanged === undefined ? {} : { filesChanged }),
        inputTokens: sql`${sessions.inputTokens} + ${this.inputDelta}`,
        outputTokens: sql`${sessions.outputTokens} + ${this.outputDelta}`,
        cacheReadTokens: sql`${sessions.cacheReadTokens} + ${this.cacheReadDelta}`,
        cacheCreationTokens: sql`${sessions.cacheCreationTokens} + ${this.cacheCreationDelta}`,
        lastUsageMessageId: this.lastUsageMessageId,
        ...(this.contextTokens === undefined ? {} : { contextTokens: this.contextTokens }),
        ...(this.lastActivityAt === undefined
          ? {}
          : { lastActivityAt: sql`max(${sessions.lastActivityAt}, ${this.lastActivityAt})` }),
        updatedAt: now(),
      })
      .where(eq(sessions.id, sessionId))
      .run()
  }

  private saveCursor(cursor: ImportCursor): void {
    const values = {
      byteOffset: cursor.byteOffset,
      fileSize: cursor.fileSize,
      nextSeq: this.nextSeq,
      parserVersion: cursor.parserVersion,
    }
    this.tx
      .insert(importCursors)
      .values({
        providerId: this.file.providerId,
        sourcePath: this.file.path,
        sessionExternalId: this.file.sessionExternalId,
        ...values,
      })
      .onConflictDoUpdate({ target: importCursors.sourcePath, set: { ...values, updatedAt: now() } })
      .run()
  }
}
