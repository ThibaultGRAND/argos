import { editorIds, type EditorId } from '../editor/editors'

export const themes = ['dark', 'light', 'system'] as const
export const languages = ['fr', 'en'] as const

export type Theme = (typeof themes)[number]
export type Language = (typeof languages)[number]

export interface Preferences {
  readonly theme: Theme
  readonly language: Language
  readonly editor: EditorId
  /** Faux tant que la langue n'a pas été choisie au premier lancement (F16). */
  readonly firstRunCompleted: boolean
}

/** Thème sombre, français et VSCode par défaut (PLAN.md §1.4, décisions du 2026-10-02). */
export const defaultPreferences: Preferences = {
  theme: 'dark',
  language: 'fr',
  editor: 'vscode',
  firstRunCompleted: false,
}

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    values.some((candidate) => candidate === value)
const isTheme = oneOf(themes)
const isLanguage = oneOf(languages)
const isEditor = oneOf(editorIds)

/**
 * Relit des préférences stockées. Une valeur absente ou invalide est remplacée par la valeur par défaut :
 * des préférences corrompues ne doivent jamais empêcher l'app de démarrer.
 */
export function restorePreferences(stored: Readonly<Record<string, unknown>>): Preferences {
  return {
    theme: isTheme(stored['theme']) ? stored['theme'] : defaultPreferences.theme,
    language: isLanguage(stored['language']) ? stored['language'] : defaultPreferences.language,
    editor: isEditor(stored['editor']) ? stored['editor'] : defaultPreferences.editor,
    firstRunCompleted:
      typeof stored['firstRunCompleted'] === 'boolean'
        ? stored['firstRunCompleted']
        : defaultPreferences.firstRunCompleted,
  }
}

export function updatePreferences(current: Preferences, changes: Partial<Preferences>): Preferences {
  return {
    theme: changes.theme ?? current.theme,
    language: changes.language ?? current.language,
    editor: changes.editor ?? current.editor,
    firstRunCompleted: changes.firstRunCompleted ?? current.firstRunCompleted,
  }
}
