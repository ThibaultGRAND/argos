import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * index.db — index reconstructible, écrit par l'indexeur seul (CLAUDE.md §5.2, features/session_import.md).
 * Clés primaires INTEGER auto-incrémentées.
 */

const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  path: text('path').notNull().unique(),
  name: text('name').notNull(),
  ...timestamps,
})

export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    providerId: text('provider_id').notNull(),
    externalId: text('external_id').notNull(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    customTitle: text('custom_title'),
    aiTitle: text('ai_title'),
    firstPrompt: text('first_prompt'),
    lastExcerpt: text('last_excerpt'),
    model: text('model'),
    gitBranch: text('git_branch'),
    cliVersion: text('cli_version'),
    startedAt: text('started_at').notNull(),
    lastActivityAt: text('last_activity_at').notNull(),
    messageCount: integer('message_count').notNull().default(0),
    toolCallCount: integer('tool_call_count').notNull().default(0),
    filesChanged: integer('files_changed').notNull().default(0),
    linesAdded: integer('lines_added').notNull().default(0),
    linesRemoved: integer('lines_removed').notNull().default(0),
    // Consommation (F08) : contexte du dernier appel du fil principal, totaux de la session.
    contextTokens: integer('context_tokens'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
    cacheCreationTokens: integer('cache_creation_tokens').notNull().default(0),
    /** Dernier appel compté : une réponse est écrite sur plusieurs lignes avec la même consommation. */
    lastUsageMessageId: text('last_usage_message_id'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('sessions_provider_external_unique').on(table.providerId, table.externalId),
    // Liste des sessions d'un projet, les plus récentes en premier.
    index('sessions_project_activity_idx').on(table.projectId, table.lastActivityAt),
  ],
)

export const messages = sqliteTable(
  'messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    seq: integer('seq').notNull(),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    text: text('text').notNull(),
    occurredAt: text('occurred_at').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('messages_session_seq_unique').on(table.sessionId, table.seq)],
)

export const toolCalls = sqliteTable(
  'tool_calls',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    seq: integer('seq').notNull(),
    toolName: text('tool_name').notNull(),
    kind: text('kind').notNull(),
    target: text('target'),
    summary: text('summary'),
    status: text('status', { enum: ['pending', 'success', 'error'] }).notNull(),
    occurredAt: text('occurred_at').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('tool_calls_session_external_unique').on(table.sessionId, table.externalId)],
)

export const fileChanges = sqliteTable(
  'file_changes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    toolCallId: integer('tool_call_id')
      .notNull()
      .references(() => toolCalls.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    linesAdded: integer('lines_added').notNull(),
    linesRemoved: integer('lines_removed').notNull(),
    ...timestamps,
  },
  (table) => [
    index('file_changes_tool_call_idx').on(table.toolCallId),
    // Retrouver les sessions qui ont modifié un fichier (blame, F12).
    index('file_changes_path_idx').on(table.path),
  ],
)

export const importCursors = sqliteTable('import_cursors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: text('provider_id').notNull(),
  sourcePath: text('source_path').notNull().unique(),
  sessionExternalId: text('session_external_id').notNull(),
  byteOffset: integer('byte_offset').notNull(),
  fileSize: integer('file_size').notNull(),
  nextSeq: integer('next_seq').notNull(),
  parserVersion: integer('parser_version').notNull(),
  ...timestamps,
})
