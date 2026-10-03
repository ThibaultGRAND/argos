import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PreferencesDto } from '@shared/contract'
import { setLocale } from '../i18n'
import { argos, unwrap } from '../services/argos'

/** État d'affichage des préférences ; la règle métier (valeurs par défaut, fusion) reste dans le domaine. */
export const usePreferencesStore = defineStore('preferences', () => {
  const preferences = ref<PreferencesDto>({
    theme: 'dark',
    language: 'fr',
    editor: 'vscode',
    firstRunCompleted: true,
    notifications: true,
  })
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)')

  function apply(): void {
    const { theme, language } = preferences.value
    const resolved = theme === 'system' ? (systemPrefersDark.matches ? 'dark' : 'light') : theme
    document.documentElement.dataset['theme'] = resolved
    setLocale(language)
  }

  systemPrefersDark.addEventListener('change', apply)

  async function load(): Promise<void> {
    preferences.value = unwrap<'preferences.get'>(await argos.invoke('preferences.get'))
    apply()
  }

  async function update(changes: Partial<PreferencesDto>): Promise<void> {
    preferences.value = unwrap<'preferences.update'>(await argos.invoke('preferences.update', changes))
    apply()
  }

  return { preferences, load, update }
})
