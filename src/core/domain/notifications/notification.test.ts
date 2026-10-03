import { describe, expect, it } from 'vitest'
import { notificationFor } from './notification'

const context = { enabled: true, appFocused: false, sessionTitle: 'Corriger le 404' }
const permission = {
  type: 'permission-requested' as const,
  request: { requestId: 'r', toolName: 'Edit', title: null, target: 'src/a.ts' },
}

describe('notificationFor', () => {
  it('notifie une demande de permission avec l’action demandée', () => {
    expect(notificationFor(permission, context)).toEqual({
      kind: 'permission',
      titleKey: 'notifications.permission.title',
      bodyKey: 'notifications.permission.body',
      params: { session: 'Corriger le 404', action: 'Edit · src/a.ts' },
    })
  })

  it('notifie la fin d’un tour et les erreurs', () => {
    expect(notificationFor({ type: 'turn-completed', isError: false, durationMs: 12_400 }, context)?.params).toEqual({
      session: 'Corriger le 404',
      seconds: 12,
    })
    expect(notificationFor({ type: 'turn-completed', isError: true, durationMs: 1 }, context)?.kind).toBe('error')
    expect(notificationFor({ type: 'status', status: 'error' }, context)?.kind).toBe('error')
  })

  it('ne dérange pas quand Argos est au premier plan, quand c’est désactivé, ni pour le reste', () => {
    expect(notificationFor(permission, { ...context, appFocused: true })).toBeUndefined()
    expect(notificationFor(permission, { ...context, enabled: false })).toBeUndefined()
    expect(notificationFor({ type: 'status', status: 'running' }, context)).toBeUndefined()
    expect(notificationFor({ type: 'assistant-delta', messageId: 'm', text: 'x' }, context)).toBeUndefined()
  })
})
