import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ContractError } from '@shared/contract'
import { ArgosRequestError } from '../services/argos'

export interface Notice {
  readonly messageKey: string
  readonly tone: 'info' | 'error'
}

const DISPLAY_MS = 5_000

/** Message bref affiché dans la barre d'état (confirmation ou erreur d'une action). */
export const useNoticesStore = defineStore('notices', () => {
  const current = ref<Notice | undefined>()
  let timer: ReturnType<typeof setTimeout> | undefined

  function show(notice: Notice): void {
    current.value = notice
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => (current.value = undefined), DISPLAY_MS)
  }

  function showError(error: ContractError): void {
    show({ messageKey: error.messageKey, tone: 'error' })
  }

  /** Exécute une action et affiche son erreur éventuelle au lieu de la laisser silencieuse. */
  async function attempt(action: () => Promise<void>): Promise<void> {
    try {
      await action()
    } catch (caught) {
      if (caught instanceof ArgosRequestError) showError(caught.error)
      else throw caught
    }
  }

  return { current, show, showError, attempt }
})
