import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { ContextGaugeDto, PlanQuotaDto } from '@shared/contract'
import { argos, unwrap } from '../services/argos'
import { useLiveStore } from './live'
import { useSessionStore } from './session'

/** Jauge de contexte de la session ouverte et quota de l'abonnement (F08). */
export const useUsageStore = defineStore('usage', () => {
  const quota = ref<PlanQuotaDto | null>(null)
  const gauge = ref<ContextGaugeDto | undefined>()
  /** Augmente quand une session en direct rapporte la taille exacte des fenêtres : la jauge est recalculée. */
  const windowsRevision = ref(0)

  const session = useSessionStore()
  const live = useLiveStore()

  /** Contexte de la session ouverte : celui du direct s'il est connu, sinon celui de l'historique importé. */
  const context = computed(() => {
    const detail = session.detail
    if (detail === undefined) return undefined
    const run = live.runForSession(detail.externalId)
    if (run?.context != null) return { model: run.context.model ?? detail.model, tokens: run.context.tokens }
    const tokens = detail.usage.contextTokens
    return tokens === null ? undefined : { model: detail.model, tokens }
  })

  let request = 0
  async function updateGauge(): Promise<void> {
    const current = context.value
    const id = ++request
    if (current === undefined) {
      gauge.value = undefined
      return
    }
    const result = await argos.invoke('usage.contextGauge', { model: current.model, tokens: current.tokens })
    // Une réponse plus ancienne que la dernière demande est ignorée.
    if (id === request && result.ok) gauge.value = result.data
  }

  async function load(): Promise<void> {
    quota.value = unwrap<'usage.quota'>(await argos.invoke('usage.quota')).quota
    argos.on('usage.quota', (next) => {
      quota.value = next
    })
    argos.on('live.event', ({ event }) => {
      if (event.type === 'context-windows') windowsRevision.value += 1
    })
    watch(
      () => [context.value?.model, context.value?.tokens, windowsRevision.value],
      () => void updateGauge(),
      { immediate: true },
    )
  }

  return { quota, gauge, load }
})
