import type { Preferences } from '../preferences/preferences'

/** Stockage des préférences de l'utilisateur (donnée propre à Argos). */
export interface PreferencesRepository {
  load(): Promise<Preferences>
  save(preferences: Preferences): Promise<void>
}
