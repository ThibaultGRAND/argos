import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { MessageHitDto, SearchPeriodDto, SearchResultsDto, SessionHitDto } from '@shared/contract'
import { argos, ArgosRequestError, unwrap } from '../services/argos'

export type SearchItem =
  { readonly kind: 'session'; readonly hit: SessionHitDto } | { readonly kind: 'message'; readonly hit: MessageHitDto }

/** État d'affichage de la palette de recherche (F03). */
export const useSearchStore = defineStore('search', () => {
  const isOpen = ref(false)
  const query = ref('')
  const scope = ref<'all' | 'project'>('all')
  const period = ref<SearchPeriodDto>('all')
  const results = ref<SearchResultsDto>({ sessions: [], messages: [] })
  const activeIndex = ref(0)
  const failed = ref(false)
  let requestId = 0

  /** Résultats dans l'ordre d'affichage, pour la navigation au clavier. */
  const items = computed<SearchItem[]>(() => [
    ...results.value.sessions.map((hit) => ({ kind: 'session' as const, hit })),
    ...results.value.messages.map((hit) => ({ kind: 'message' as const, hit })),
  ])

  function open(): void {
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
  }

  async function run(projectId: number | undefined): Promise<void> {
    const current = ++requestId
    try {
      failed.value = false
      const found = unwrap<'search.query'>(
        await argos.invoke('search.query', {
          query: query.value,
          period: period.value,
          ...(scope.value === 'project' && projectId !== undefined ? { projectId } : {}),
        }),
      )
      // Ignore les réponses d'une saisie déjà dépassée.
      if (current !== requestId) return
      results.value = found
      activeIndex.value = 0
    } catch (caught) {
      if (!(caught instanceof ArgosRequestError)) throw caught
      if (current === requestId) failed.value = true
    }
  }

  function move(step: number): void {
    const count = items.value.length
    if (count === 0) return
    activeIndex.value = (activeIndex.value + step + count) % count
  }

  return { isOpen, query, scope, period, results, items, activeIndex, failed, open, close, run, move }
})
