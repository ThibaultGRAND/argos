import { computed, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useUsageStore } from '../../stores/usage'
import { formatTokens } from '../../utils/format'

/** Texte de la jauge de contexte : « 130 k / 1 M · 13 % », ou la quantité seule si la fenêtre est inconnue (F08). */
export function useContextText(): ComputedRef<string | undefined> {
  const { t, locale } = useI18n()
  const { gauge } = storeToRefs(useUsageStore())
  return computed(() => {
    const current = gauge.value
    if (current === undefined) return undefined
    const used = formatTokens(current.tokens, locale.value)
    return current.window === null || current.percent === null
      ? used
      : t('usage.contextValue', { used, window: formatTokens(current.window, locale.value), percent: current.percent })
  })
}
