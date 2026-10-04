import { describe, expect, it } from 'vitest'
import { planQuotaFrom } from './claude-usage-probe'

const at = '2026-10-04T10:00:00.000Z'

describe('planQuotaFrom', () => {
  it('lit les fenêtres de 5 heures, de la semaine et propres à un modèle', () => {
    const quota = planQuotaFrom(
      {
        rate_limits_available: true,
        rate_limits: {
          five_hour: { utilization: 16, resets_at: '2026-10-04T00:39:59Z' },
          seven_day: { utilization: 14.2, resets_at: '2026-10-06T23:59:59Z' },
          seven_day_opus: null,
          model_scoped: [{ display_name: 'Fable', utilization: 0, resets_at: '2026-10-07T00:00:00Z' }],
          un_champ_inconnu: { utilization: 99 },
        },
      },
      at,
    )
    expect(quota).toEqual({
      fetchedAt: at,
      windows: [
        { kind: 'session', label: null, utilization: 16, resetsAt: '2026-10-04T00:39:59Z' },
        { kind: 'weekly', label: null, utilization: 14, resetsAt: '2026-10-06T23:59:59Z' },
        { kind: 'weekly-model', label: 'Fable', utilization: 0, resetsAt: '2026-10-07T00:00:00Z' },
      ],
    })
  })

  it('renvoie null quand les limites ne s’appliquent pas ou que la réponse est illisible', () => {
    expect(planQuotaFrom({ rate_limits_available: false, rate_limits: null }, at)).toBeNull()
    expect(planQuotaFrom('n’importe quoi', at)).toBeNull()
    expect(
      planQuotaFrom({ rate_limits_available: true, rate_limits: { five_hour: { utilization: null } } }, at),
    ).toBeNull()
  })
})
