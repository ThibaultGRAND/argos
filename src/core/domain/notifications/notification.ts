import type { LiveEvent } from '../live/live-events'

/** Contenu d'une notification, en clés de traduction : le texte est produit dans la langue choisie. */
export interface NotificationContent {
  readonly kind: 'permission' | 'turn-completed' | 'error'
  readonly titleKey: string
  readonly bodyKey: string
  readonly params: Readonly<Record<string, string | number>>
}

export interface NotificationContext {
  readonly enabled: boolean
  /** Vrai si la fenêtre d'Argos est au premier plan : on ne dérange pas (principe produit n°6). */
  readonly appFocused: boolean
  readonly sessionTitle: string
}

/** Notification à afficher pour un événement d'une session pilotée, ou `undefined` (F14). */
export function notificationFor(event: LiveEvent, context: NotificationContext): NotificationContent | undefined {
  if (!context.enabled || context.appFocused) return undefined
  const session = context.sessionTitle
  switch (event.type) {
    case 'permission-requested': {
      const { request } = event
      const action =
        request.title ?? (request.target === null ? request.toolName : `${request.toolName} · ${request.target}`)
      return {
        kind: 'permission',
        titleKey: 'notifications.permission.title',
        bodyKey: 'notifications.permission.body',
        params: { session, action },
      }
    }
    case 'turn-completed':
      return event.isError
        ? {
            kind: 'error',
            titleKey: 'notifications.error.title',
            bodyKey: 'notifications.error.body',
            params: { session },
          }
        : {
            kind: 'turn-completed',
            titleKey: 'notifications.turnCompleted.title',
            bodyKey: 'notifications.turnCompleted.body',
            params: { session, seconds: Math.max(1, Math.round(event.durationMs / 1000)) },
          }
    case 'status':
      return event.status === 'error'
        ? {
            kind: 'error',
            titleKey: 'notifications.error.title',
            bodyKey: 'notifications.error.body',
            params: { session },
          }
        : undefined
    default:
      return undefined
  }
}
