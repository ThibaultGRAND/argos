import { compile, createCoreContext, registerMessageCompiler, translate, type CoreContext } from '@intlify/core'
import type { Translator } from '../../core/domain/ports/notifier'
import { catalogs } from '../../shared/i18n/catalogs'

registerMessageCompiler(compile)

/** Traduction côté processus principal, avec les mêmes catalogues que l'interface (PLAN.md §3.5). */
export class IntlifyTranslator implements Translator {
  private readonly contexts = new Map<'fr' | 'en', CoreContext>()

  translate(language: 'fr' | 'en', key: string, params: Readonly<Record<string, string | number>>): string {
    let context = this.contexts.get(language)
    if (context === undefined) {
      context = createCoreContext({ locale: language, fallbackLocale: 'fr', messages: catalogs, missingWarn: false })
      this.contexts.set(language, context)
    }
    const result = translate(context, key, { ...params })
    return typeof result === 'string' ? result : key
  }
}
