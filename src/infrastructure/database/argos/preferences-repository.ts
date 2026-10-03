import { randomUUID } from 'node:crypto'
import { like } from 'drizzle-orm'
import type { PreferencesRepository } from '../../../core/domain/ports/preferences-repository'
import { restorePreferences, type Preferences } from '../../../core/domain/preferences/preferences'
import type { ArgosDatabase } from './argos-database'
import { settings } from './schema'

const PREFIX = 'preferences.'

export class SqlitePreferencesRepository implements PreferencesRepository {
  constructor(private readonly database: ArgosDatabase) {}

  async load(): Promise<Preferences> {
    const rows = this.database
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(like(settings.key, `${PREFIX}%`))
      .all()

    const stored: Record<string, unknown> = {}
    for (const row of rows) {
      stored[row.key.slice(PREFIX.length)] = parseJson(row.value)
    }
    return restorePreferences(stored)
  }

  async save(preferences: Preferences): Promise<void> {
    const now = new Date().toISOString()
    this.database.transaction((tx) => {
      for (const [name, value] of Object.entries(preferences)) {
        tx.insert(settings)
          .values({
            id: randomUUID(),
            key: `${PREFIX}${name}`,
            value: JSON.stringify(value),
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value), updatedAt: now } })
          .run()
      }
    })
  }
}

/** Une valeur illisible est ignorée : les préférences par défaut prennent le relais. */
function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch (error) {
    if (error instanceof SyntaxError) return undefined
    throw error
  }
}
