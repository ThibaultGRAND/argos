<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { ModelChoiceDto, TurnChangeDto } from '@shared/contract'
import LiveComposer from '../live/LiveComposer.vue'
import PermissionCard from '../live/PermissionCard.vue'
import { useAppStatusStore } from '../../stores/app-status'
import { useHistoryStore } from '../../stores/history'
import { ACTIVE_STATUSES, useLiveStore } from '../../stores/live'
import { useNoticesStore } from '../../stores/notices'
import { useSessionStore } from '../../stores/session'
import { useSnapshotsStore } from '../../stores/snapshots'
import { useReviewStore } from '../../stores/review'
import ReviewView from '../review/ReviewView.vue'
import RestoreDialog from '../snapshots/RestoreDialog.vue'
import TurnChangeLine from '../snapshots/TurnChangeLine.vue'
import UiEmptyState from '../../ui/UiEmptyState.vue'
import { groupTimeline } from '../../utils/timeline'
import SessionHeader from './SessionHeader.vue'
import TimelineMessage from './TimelineMessage.vue'
import TimelineToolGroup from './TimelineToolGroup.vue'

/**
 * Compte rendu d'une session (F02), avec la suite en direct quand Argos la pilote (F05) :
 * historique importé, puis entrées en direct du tour en cours, puis demandes de permission et zone de saisie.
 */
const props = defineProps<{ id: number; seq?: number | undefined }>()

const session = useSessionStore()
const history = useHistoryStore()
const live = useLiveStore()
const notices = useNoticesStore()
const appStatus = useAppStatusStore()
const snapshotsStore = useSnapshotsStore()
const reviewStore = useReviewStore()
const { detail, entries, hasMore, loading, error } = storeToRefs(session)
const { tab } = storeToRefs(reviewStore)

const macos = computed(() => appStatus.info?.platform === 'darwin')
const run = computed(() => live.runForSession(detail.value?.externalId))
const active = computed(() => run.value !== undefined && ACTIVE_STATUSES.includes(run.value.status))
const blocks = computed(() => {
  const current = run.value
  if (current === undefined) return groupTimeline(entries.value)
  const liveStart = live.liveStartOf(current)
  const persisted =
    liveStart === undefined
      ? entries.value
      : entries.value.filter((entry) => new Date(entry.occurredAt).getTime() < liveStart)
  return groupTimeline([...persisted, ...live.entriesOf(current)])
})

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

watch(
  () => detail.value?.externalId,
  (externalId) => {
    tab.value = 'report'
    void notices.attempt(() => snapshotsStore.load(externalId))
    void notices.attempt(() => reviewStore.load(externalId))
  },
  { immediate: true },
)

watch(detail, (loaded) => {
  if (loaded !== undefined) void history.revealProject(loaded.projectId)
})

/** Ligne d'un tour qui a modifié des fichiers, placée après le dernier bloc antérieur à la fin du tour. */
const turnsAfter = computed(() => {
  const placed = new Map<number, TurnChangeDto[]>()
  const list = blocks.value
  for (const turn of snapshotsStore.changes?.turns ?? []) {
    const time = new Date(turn.createdAt).getTime()
    let index = -1
    list.forEach((block, position) => {
      const entries = block.type === 'message' ? [block.entry] : block.entries
      if (entries.some((entry) => new Date(entry.occurredAt).getTime() <= time)) index = position
    })
    const key = list[index]?.number ?? 0
    placed.set(key, [...(placed.get(key) ?? []), turn])
  }
  return placed
})

// Pendant un tour, l'historique est figé pour éviter les doublons ; à la fin du tour, il est relu.
watch(
  active,
  (isActive, wasActive) => {
    session.frozen = isActive
    if (wasActive === true && !isActive) void session.refresh()
  },
  { immediate: true },
)

// Quand l'historique a rattrapé un tour terminé, l'affichage en direct de ce tour s'efface.
watch(
  () => entries.value.length,
  () => {
    if (run.value !== undefined) live.releaseCaughtUpTurns(run.value, entries.value.at(-1)?.occurredAt)
  },
)

// Suit la fin du document pendant que l'agent écrit, si l'on est déjà en bas.
watch(
  () =>
    blocks.value.length +
    (run.value?.items.at(-1)?.kind === 'assistant' ? (run.value.items.at(-1) as { text: string }).text.length : 0),
  async () => {
    const container = document.querySelector<HTMLElement>('.shell__document')
    if (container === null) return
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 240
    await nextTick()
    if (nearBottom) container.scrollTop = container.scrollHeight
  },
)

// Une demande de permission bloque l'agent : on l'amène sous les yeux.
watch(
  () => run.value?.pendingPermissions.length ?? 0,
  async (count, previous) => {
    if (count <= (previous ?? 0)) return
    await nextTick()
    document.querySelector('.permission:last-of-type')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  },
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

async function submit(text: string, model: ModelChoiceDto | undefined): Promise<void> {
  const loaded = detail.value
  if (loaded === undefined) return
  await notices.attempt(async () => {
    // L'agent répond à la fin de la conversation : on la charge en entier avant d'y ajouter la suite.
    await session.loadUntil(Number.MAX_SAFE_INTEGER)
    const current = run.value
    if (current !== undefined && current.status !== 'ended' && current.status !== 'error') {
      await live.send(current.runId, text)
    } else {
      await live.continueSession(loaded.id, text, model)
    }
  })
}

function answer(requestId: string, decision: 'allow' | 'allow-session' | 'deny'): void {
  const current = run.value
  if (current !== undefined) void notices.attempt(() => live.answer(current.runId, requestId, decision))
}

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
      <SessionHeader :detail="detail" :run="run" />
      <nav class="session__tabs">
        <button
          type="button"
          class="session__tab"
          :class="{ 'session__tab--active': tab === 'report' }"
          @click="tab = 'report'"
        >
          {{ $t('review.tabs.report') }}
        </button>
        <button
          type="button"
          class="session__tab"
          :class="{ 'session__tab--active': tab === 'review' }"
          @click="tab = 'review'"
        >
          {{
            $t(
              'review.tabs.review',
              { count: reviewStore.diff?.files.length ?? 0 },
              reviewStore.diff?.files.length ?? 0,
            )
          }}
        </button>
      </nav>
      <ReviewView v-if="tab === 'review'" :detail="detail" />
      <div v-show="tab === 'report'" class="session__timeline">
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
          <TurnChangeLine v-for="turn in turnsAfter.get(block.number) ?? []" :key="turn.snapshotId" :turn="turn" />
        </template>
        <p v-if="blocks.length === 0 && !loading" class="session__note">{{ $t('document.noEntries') }}</p>
        <div v-if="hasMore" ref="sentinel" class="session__note">{{ $t('document.loadingMore') }}</div>
        <p
          v-if="run?.status === 'starting' || (run?.status === 'running' && run.items.at(-1)?.kind !== 'assistant')"
          class="session__note"
        >
          {{ $t('live.working') }}
        </p>
        <PermissionCard
          v-for="request in run?.pendingPermissions ?? []"
          :key="request.requestId"
          :request="request"
          :project-path="detail.projectPath"
          @answer="(decision) => answer(request.requestId, decision)"
        />
      </div>
      <div v-show="tab === 'report'" class="session__composer">
        <LiveComposer :macos="macos" @submit="submit" />
      </div>
      <RestoreDialog />
    </template>
  </div>
</template>

<style scoped>
.session {
  max-width: var(--size-document);
  margin: 0 auto;
  padding: 0 24px;
}

.session__timeline {
  padding: 8px 0 24px;
}

.session__note {
  padding: 24px 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx3);
  text-align: center;
}

.session__tabs {
  display: flex;
  gap: 18px;
  border-bottom: 1px solid var(--rule);
}

.session__tab {
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid transparent;
  margin-bottom: -1px;
  background: none;
  font-size: 13px;
  color: var(--tx3);
  cursor: pointer;
}

.session__tab--active {
  border-bottom-color: var(--tx);
  color: var(--tx);
}

.session__composer {
  position: sticky;
  bottom: 0;
  padding: 12px 0 20px;
  background: linear-gradient(to bottom, transparent, var(--bg) 18px);
}
</style>
