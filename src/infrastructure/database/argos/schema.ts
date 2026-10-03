import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
