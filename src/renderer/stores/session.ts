import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ContractError, SessionDetailDto, TimelineEntryDto } from '@shared/contract'
import { argos, ArgosRequestError, unwrap } from '../services/argos'
import { groupTimeline } from '../utils/timeline'

/** État d'affichage de la session ouverte : fiche, entrées chargées, pagination. */
export const useSessionStore = defineStore('session', () => {
  const sessionId = ref<number | undefined>()
  const detail = ref<SessionDetailDto | undefined>()
  const entries = ref<TimelineEntryDto[]>([])
  const nextSeq = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<ContractError | undefined>()

  const blocks = computed(() => groupTimeline(entries.value))
  const hasMore = computed(() => nextSeq.value !== null)

  async function guarded(action: () => Promise<void>): Promise<void> {
    try {
      error.value = undefined
      await action()
    } catch (caught) {
      if (caught instanceof ArgosRequestError) error.value = caught.error
      else throw caught
    }
  }

  async function open(id: number): Promise<void> {
    sessionId.value = id
    detail.value = undefined
    entries.value = []
    nextSeq.value = null
    loading.value = true
    await guarded(async () => {
      const [loadedDetail, page] = await Promise.all([
        argos.invoke('sessions.get', { sessionId: id }),
        argos.invoke('sessions.entries', { sessionId: id }),
      ])
      if (sessionId.value !== id) return
      detail.value = unwrap<'sessions.get'>(loadedDetail)
      const firstPage = unwrap<'sessions.entries'>(page)
      entries.value = firstPage.entries
      nextSeq.value = firstPage.nextSeq
    })
    loading.value = false
  }

  function close(): void {
    sessionId.value = undefined
    detail.value = undefined
    entries.value = []
    nextSeq.value = null
    error.value = undefined
  }

  async function loadMore(): Promise<void> {
    const id = sessionId.value
    const after = nextSeq.value
    if (id === undefined || after === null || loading.value) return
    loading.value = true
    await guarded(async () => {
      const page = unwrap<'sessions.entries'>(
        await argos.invoke('sessions.entries', { sessionId: id, afterSeq: after }),
      )
      if (sessionId.value !== id) return
      entries.value = [...entries.value, ...page.entries]
      nextSeq.value = page.nextSeq
    })
    loading.value = false
  }

  /** Charge les pages jusqu'à contenir l'entrée `seq` (ouverture depuis un résultat de recherche). */
  async function loadUntil(seq: number): Promise<void> {
    while (hasMore.value && (entries.value.at(-1)?.seq ?? -1) < seq) {
      const before = entries.value.length
      await loadMore()
      if (entries.value.length === before) return
    }
  }

  /** L'index a changé : met à jour la fiche et, si tout est déjà chargé, ajoute les nouvelles entrées. */
  async function refresh(): Promise<void> {
    const id = sessionId.value
    if (id === undefined || loading.value) return
    await guarded(async () => {
      detail.value = unwrap<'sessions.get'>(await argos.invoke('sessions.get', { sessionId: id }))
      if (nextSeq.value !== null) return
      const last = entries.value.at(-1)?.seq ?? -1
      const page = unwrap<'sessions.entries'>(await argos.invoke('sessions.entries', { sessionId: id, afterSeq: last }))
      if (sessionId.value !== id) return
      entries.value = [...entries.value, ...page.entries]
      nextSeq.value = page.nextSeq
    })
  }

  function watchIndex(): void {
    argos.on('index.updated', () => void refresh())
  }

  return { sessionId, detail, entries, blocks, hasMore, loading, error, open, close, loadMore, loadUntil, watchIndex }
})
