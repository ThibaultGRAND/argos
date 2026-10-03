import { createI18n } from 'vue-i18n'
import { catalogs, type MessageSchema } from '@shared/i18n/catalogs'

export type Locale = 'fr' | 'en'

export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'fr',
  messages: catalogs,
})

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
}
