import { describe, expect, it } from 'vitest'
import { defaultPreferences, type Preferences } from '../../domain/preferences/preferences'
import { NotificationService, type RunInfo } from './notification-service'

function setup(focused: boolean, preferences: Partial<Preferences> = {}) {
  const shown: [string, string, () => void][] = []
  const badges: number[] = []
  const opened: (number | null)[] = []
  const runs = new Map<string, RunInfo>([
    ['run-1', { sessionExternalId: 's-1', projectPath: '/p/demo', waiting: true }],
  ])
  const service = new NotificationService({
    notifier: { show: (title, body, onClick) => void shown.push([title, body, onClick]) },
    presence: { isFocused: () => focused, setBadge: (count) => void badges.push(count) },
    translator: { translate: (language, key, params) => `${language}:${key}:${JSON.stringify(params)}` },
    preferences: { load: async () => ({ ...defaultPreferences, ...preferences }), save: async () => undefined },
    runs: () => runs,
    describeSession: () => ({ title: 'Corriger le 404', sessionId: 42 }),
    open: (sessionId) => void opened.push(sessionId),
  })
  return { service, shown, badges, opened }
}

const permission = {
  type: 'permission-requested' as const,
  request: { requestId: 'r', toolName: 'Edit', title: 'Claude veut modifier a.ts', target: 'a.ts' },
}

describe('NotificationService', () => {
  it('notifie en arrière-plan, dans la langue choisie, et ouvre la session au clic', async () => {
    const { service, shown, badges, opened } = setup(false, { language: 'en' })
    await service.onLiveEvent('run-1', permission)
    expect(shown[0]?.[0]).toBe(
      'en:notifications.permission.title:{"session":"Corriger le 404","action":"Claude veut modifier a.ts"}',
    )
    shown[0]?.[2]()
    expect(opened).toEqual([42])
    expect(badges).toEqual([1])
  })

  it('ne notifie pas au premier plan ni quand c’est désactivé, mais tient le badge à jour', async () => {
    const focused = setup(true)
    await focused.service.onLiveEvent('run-1', permission)
    expect(focused.shown).toEqual([])
    expect(focused.badges).toEqual([1])

    const disabled = setup(false, { notifications: false })
    await disabled.service.onLiveEvent('run-1', permission)
    expect(disabled.shown).toEqual([])
  })
})
