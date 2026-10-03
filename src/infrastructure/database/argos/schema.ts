import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * argos.db — données propres à Argos, non reconstructibles (CLAUDE.md §5.2).
 * Clés primaires TEXT UUID.
 */

/** Réglages de l'app, une ligne par clé (ex. `preferences.theme`). Valeur en JSON. */
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

/**
 * Snapshots des fichiers d'un projet (F06). La session est référencée par sa clé naturelle
 * (`provider_id` + `session_external_id`), jamais par l'id de index.db (CLAUDE.md §5.2).
 */
export const snapshots = sqliteTable(
  'snapshots',
  {
    id: text('id').primaryKey(),
    projectPath: text('project_path').notNull(),
    providerId: text('provider_id').notNull(),
    sessionExternalId: text('session_external_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    kind: text('kind', { enum: ['baseline', 'turn', 'before_restore'] }).notNull(),
    commitHash: text('commit_hash').notNull(),
    parentCommitHash: text('parent_commit_hash'),
    filesChanged: integer('files_changed').notNull(),
    linesAdded: integer('lines_added').notNull(),
    linesRemoved: integer('lines_removed').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    // Snapshots d'une session, dans l'ordre (panneau E).
    index('snapshots_session_idx').on(table.providerId, table.sessionExternalId, table.ordinal),
  ],
)
