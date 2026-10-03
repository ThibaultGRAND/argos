import type { MessageSchema } from '@shared/i18n/catalogs'

/** Clés de traduction typées : une clé inexistante fait échouer la compilation (PLAN.md §3.5). */
declare module 'vue-i18n' {
  // L'augmentation de module de vue-i18n impose une interface vide qui étend le schéma.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MessageSchema {}
}
