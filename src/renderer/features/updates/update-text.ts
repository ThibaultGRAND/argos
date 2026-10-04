import { computed, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAppStatusStore } from '../../stores/app-status'
import { formatTime } from '../../utils/format'

/** Texte de l'état des mises à jour, partagé par la barre d'état et les paramètres (F09). */
export function useUpdateText(): ComputedRef<string> {
  const { t, locale } = useI18n()
  const { update } = storeToRefs(useAppStatusStore())
  return computed(() => {
    const state = update.value
    switch (state.kind) {
      case 'unsupported':
        return t('settings.updatesDev')
      case 'idle':
      case 'checking':
        return t(`updates.${state.kind}`)
      case 'up-to-date':
        return t('updates.up-to-date', { time: formatTime(state.checkedAt, locale.value) })
      case 'available':
      case 'ready':
        return t(`updates.${state.kind}`, { version: state.version })
      case 'downloading':
        return t('updates.downloading', { version: state.version, percent: state.percent })
    }
    return t('updates.error', { message: state.message })
  })
}
