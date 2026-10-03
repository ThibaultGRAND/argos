export const themes = ['dark', 'light', 'system'] as const
export const languages = ['fr', 'en'] as const

export type Theme = (typeof themes)[number]
export type Language = (typeof languages)[number]

export interface Preferences {
  readonly theme: Theme
  readonly language: Language
}

/** Thème sombre et français par défaut (PLAN.md §1.4, décision du 2026-10-02). */
export const defaultPreferences: Preferences = { theme: 'dark', language: 'fr' }

const isTheme = (value: unknown): value is Theme => themes.some((theme) => theme === value)
const isLanguage = (value: unknown): value is Language => languages.some((language) => language === value)

/**
 * Relit des préférences stockées. Une valeur absente ou invalide est remplacée par la valeur par défaut :
 * des préférences corrompues ne doivent jamais empêcher l'app de démarrer.
 */
export function restorePreferences(stored: Readonly<Record<string, unknown>>): Preferences {
  return {
    theme: isTheme(stored['theme']) ? stored['theme'] : defaultPreferences.theme,
    language: isLanguage(stored['language']) ? stored['language'] : defaultPreferences.language,
  }
}

export function updatePreferences(current: Preferences, changes: Partial<Preferences>): Preferences {
  return {
    theme: changes.theme ?? current.theme,
    language: changes.language ?? current.language,
  }
}
