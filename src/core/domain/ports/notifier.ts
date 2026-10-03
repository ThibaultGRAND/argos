/** Notification du système (F14). `onClick` est appelé quand l'utilisateur clique dessus. */
export interface Notifier {
  show(title: string, body: string, onClick: () => void): void
}

/** Présence de l'app : fenêtre au premier plan, badge sur l'icône. */
export interface AppPresence {
  isFocused(): boolean
  setBadge(count: number): void
}

/** Traduction dans la langue choisie, côté processus principal. */
export interface Translator {
  translate(language: 'fr' | 'en', key: string, params: Readonly<Record<string, string | number>>): string
}
