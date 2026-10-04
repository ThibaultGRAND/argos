import { describe, expect, it, vi } from 'vitest'
import type { UsageProbe } from '../../domain/ports/usage-probe'
import type { PlanQuota } from '../../domain/usage/usage'
import { QUOTA_MIN_INTERVAL_MS, UsageService } from './usage-service'

const quota: PlanQuota = {
  fetchedAt: '2026-10-04T10:00:00.000Z',
  windows: [{ kind: 'session', label: null, utilization: 16, resetsAt: null }],
}

function setup(probe: Partial<UsageProbe> = {}) {
  let time = 0
  const fullProbe: UsageProbe = {
    contextLimits: vi.fn(async () => ({ window: 1_000_000, autoCompactAt: 967_000 })),
    quota: vi.fn(async () => quota),
    ...probe,
  }
  const onQuota = vi.fn()
  const log = vi.fn()
  const service = new UsageService({ probe: fullProbe, now: () => new Date(time), onQuota, log })
  return { service, probe: fullProbe, onQuota, log, advance: (ms: number) => (time += ms) }
}

describe('UsageService', () => {
  it('demande les limites d’un modèle une seule fois, même en parallèle', async () => {
    const { service, probe } = setup()
    const [a, b] = await Promise.all([service.contextLimits('opus'), service.contextLimits('opus')])
    await service.contextLimits('opus')
    expect([a?.window, b?.window]).toEqual([1_000_000, 1_000_000])
    expect(probe.contextLimits).toHaveBeenCalledTimes(1)
  })

  it('corrige la fenêtre avec celle vue en direct, en gardant la réserve de compactage', async () => {
    const contextLimits = vi.fn(async () => ({ window: 200_000, autoCompactAt: 167_000 }))
    const { service } = setup({ contextLimits })
    service.rememberContextWindow('sonnet', 1_000_000)
    expect(await service.contextLimits('sonnet')).toEqual({ window: 1_000_000, autoCompactAt: 967_000 })
  })

  it('ne mémorise pas un échec de la sonde', async () => {
    const contextLimits = vi
      .fn()
      .mockRejectedValueOnce(new Error('panne'))
      .mockResolvedValue({ window: 200_000, autoCompactAt: null })
    const { service, log } = setup({ contextLimits })
    expect(await service.contextLimits('haiku')).toBeNull()
    expect((await service.contextLimits('haiku'))?.window).toBe(200_000)
    expect(log).toHaveBeenCalledOnce()
  })

  it('relit le quota au plus une fois par minute et le diffuse', async () => {
    const { service, probe, onQuota, advance } = setup()
    await service.refreshQuota()
    await service.refreshQuota()
    expect(probe.quota).toHaveBeenCalledTimes(1)
    expect(onQuota).toHaveBeenCalledWith(quota)
    expect(service.currentQuota()).toBe(quota)

    advance(QUOTA_MIN_INTERVAL_MS)
    await service.refreshQuota()
    expect(probe.quota).toHaveBeenCalledTimes(2)
  })

  it('garde le dernier quota connu si la lecture échoue', async () => {
    const quotaProbe = vi.fn().mockResolvedValueOnce(quota).mockRejectedValue(new Error('hors ligne'))
    const { service, advance, log } = setup({ quota: quotaProbe })
    await service.refreshQuota()
    advance(QUOTA_MIN_INTERVAL_MS)
    await service.refreshQuota()
    expect(service.currentQuota()).toBe(quota)
    expect(log).toHaveBeenCalledOnce()
  })

  it('reste muet sans fournisseur capable de lire son usage', async () => {
    const service = new UsageService({ probe: undefined, now: () => new Date(), onQuota: vi.fn(), log: vi.fn() })
    expect(await service.contextLimits('opus')).toBeNull()
    await service.refreshQuota()
    expect(service.currentQuota()).toBeNull()
  })

  it('calcule la jauge d’une session à partir de la fenêtre de son modèle', async () => {
    const { service } = setup()
    expect(await service.gauge('claude-opus-5-5', 130_000)).toEqual({
      tokens: 130_000,
      window: 1_000_000,
      percent: 13,
      level: 'normal',
      autoCompactAt: 967_000,
    })
    expect((await service.gauge(null, 130_000)).window).toBeNull()
  })
})
