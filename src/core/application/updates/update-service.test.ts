import { describe, expect, it, vi } from 'vitest'
import { defaultPreferences, type Preferences } from '../../domain/preferences/preferences'
import type { UpdateChannel, UpdateChannelListener } from '../../domain/ports/update-channel'
import type { UpdateMode, UpdateState } from '../../domain/updates/update'
import { UpdateService } from './update-service'

function setup(
  options: { supported?: boolean; mode?: UpdateMode; latest?: string | null; preferences?: Partial<Preferences> } = {},
) {
  let listener: UpdateChannelListener | undefined
  const channel: UpdateChannel = {
    supported: options.supported ?? true,
    mode: options.mode ?? 'manual',
    check: vi.fn(async () => options.latest ?? null),
    installAndRestart: vi.fn(),
    setListener: (next) => {
      listener = next
    },
  }
  const opened: string[] = []
  const states: UpdateState[] = []
  const stop = vi.fn()
  const service = new UpdateService({
    channel,
    preferences: { load: async () => ({ ...defaultPreferences, ...options.preferences }), save: async () => undefined },
    links: { open: async (url) => void opened.push(url) },
    repositoryUrl: 'https://github.com/ThibaultGRAND/argos',
    now: () => new Date('2026-10-04T12:00:00.000Z'),
    every: () => stop,
    onState: (state) => states.push(state),
    log: () => undefined,
  })
  return { service, channel, opened, states, stop, listener: () => listener }
}

describe('UpdateService', () => {
  it('ne vérifie rien en développement', async () => {
    const { service, channel } = setup({ supported: false })
    await service.start()
    expect(service.current()).toEqual({ kind: 'unsupported' })
    expect(channel.check).not.toHaveBeenCalled()
  })

  it('vérifie au démarrage, sauf si l’utilisateur l’a désactivé', async () => {
    const enabled = setup({ latest: '0.2.0' })
    await enabled.service.start()
    expect(enabled.service.current()).toEqual({ kind: 'available', version: '0.2.0', mode: 'manual' })

    const disabled = setup({ latest: '0.2.0', preferences: { updates: false } })
    await disabled.service.start()
    expect(disabled.channel.check).not.toHaveBeenCalled()
    // « Vérifier maintenant » fonctionne quand même.
    await disabled.service.check()
    expect(disabled.service.current().kind).toBe('available')
  })

  it('ouvre la page de la version en mode manuel', async () => {
    const { service, opened } = setup({ latest: '0.2.0' })
    await service.check()
    await service.install()
    expect(opened).toEqual(['https://github.com/ThibaultGRAND/argos/releases/tag/v0.2.0'])
  })

  it('suit le téléchargement en mode automatique, puis installe au redémarrage', async () => {
    const { service, channel, listener } = setup({ mode: 'automatic', latest: '0.2.0' })
    await service.check()
    listener()?.onProgress('0.2.0', 40)
    expect(service.current()).toEqual({ kind: 'downloading', version: '0.2.0', percent: 40 })
    listener()?.onDownloaded('0.2.0')
    await service.install()
    expect(channel.installAndRestart).toHaveBeenCalledOnce()
    // Une fois prête, une nouvelle vérification ne fait pas reculer l'état.
    await service.check()
    expect(service.current()).toEqual({ kind: 'ready', version: '0.2.0' })
  })

  it('signale qu’on est à jour, ou une erreur', async () => {
    const upToDate = setup({ latest: null })
    await upToDate.service.check()
    expect(upToDate.service.current()).toEqual({ kind: 'up-to-date', checkedAt: '2026-10-04T12:00:00.000Z' })

    const failing = setup()
    vi.mocked(failing.channel.check).mockRejectedValueOnce(new Error('hors ligne'))
    await failing.service.check()
    expect(failing.service.current()).toMatchObject({ kind: 'error', message: 'hors ligne' })
  })

  it('arrête la minuterie', async () => {
    const { service, stop } = setup()
    await service.start()
    service.stop()
    expect(stop).toHaveBeenCalledOnce()
  })
})
