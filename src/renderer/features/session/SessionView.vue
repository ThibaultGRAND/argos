<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useHistoryStore } from '../../stores/history'
import { useSessionStore } from '../../stores/session'
import UiEmptyState from '../../ui/UiEmptyState.vue'
import SessionHeader from './SessionHeader.vue'
import TimelineMessage from './TimelineMessage.vue'
import TimelineToolGroup from './TimelineToolGroup.vue'

/** Compte rendu d'une session (F02) : en-tête, entrées numérotées, chargement de la suite en descendant. */
const props = defineProps<{ id: number; seq?: number | undefined }>()

const session = useSessionStore()
const history = useHistoryStore()
const { detail, blocks, hasMore, loading, error } = storeToRefs(session)

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined

watch(
  () => [props.id, props.seq] as const,
  async ([id, seq], previous) => {
    history.selectSession(id)
    if (previous === undefined || previous[0] !== id) await session.open(id)
    if (seq !== undefined) await revealEntry(seq)
  },
  { immediate: true },
)

/** Fait défiler jusqu'au message `seq` et le met en évidence un instant. */
async function revealEntry(seq: number): Promise<void> {
  await session.loadUntil(seq)
  await nextTick()
  const element = document.querySelector<HTMLElement>(`[data-seq="${seq}"]`)
  if (element === null) return
  element.scrollIntoView({ block: 'center' })
  element.classList.remove('message--target')
  void element.offsetWidth
  element.classList.add('message--target')
}

watch(detail, (loaded) => {
  if (loaded !== undefined) void history.revealProject(loaded.projectId)
})

onMounted(() => {
  // Charge la page suivante quand le bas du document approche.
  observer = new IntersectionObserver(
    (observed) => {
      if (observed.some((entry) => entry.isIntersecting)) void session.loadMore()
    },
    { rootMargin: '600px' },
  )
  watch(
    sentinel,
    (element, previous) => {
      if (previous) observer?.unobserve(previous)
      if (element) observer?.observe(element)
    },
    { immediate: true },
  )
})

onBeforeUnmount(() => {
  observer?.disconnect()
  session.close()
})
</script>

<template>
  <div class="session">
    <UiEmptyState v-if="error" :title="$t('document.loadError')" />
    <template v-else-if="detail">
      <SessionHeader :detail="detail" />
      <div class="session__timeline">
        <template v-for="block in blocks" :key="block.number">
          <TimelineMessage v-if="block.type === 'message'" :number="block.number" :entry="block.entry" />
          <TimelineToolGroup
            v-else
            :number="block.number"
            :entries="block.entries"
            :counts="block.counts"
            :errors="block.errors"
            :project-path="detail.projectPath"
          />
        </template>
        <p v-if="blocks.length === 0 && !loading" class="session__note">{{ $t('document.noEntries') }}</p>
        <div v-if="hasMore" ref="sentinel" class="session__note">{{ $t('document.loadingMore') }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.session {
  max-width: var(--size-document);
  margin: 0 auto;
  padding: 0 24px 64px;
}

.session__timeline {
  padding-top: 8px;
}

.session__note {
  padding: 24px 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx3);
  text-align: center;
}
</style>
