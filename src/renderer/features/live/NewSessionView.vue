<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { ModelChoiceDto } from '@shared/contract'
import { argos, unwrap } from '../../services/argos'
import { useAppStatusStore } from '../../stores/app-status'
import { useHistoryStore } from '../../stores/history'
import { useLiveStore } from '../../stores/live'
import { useNoticesStore } from '../../stores/notices'
import UiEmptyState from '../../ui/UiEmptyState.vue'
import UiMarker from '../../ui/UiMarker.vue'
import { groupTimeline } from '../../utils/timeline'
import TimelineMessage from '../session/TimelineMessage.vue'
import TimelineToolGroup from '../session/TimelineToolGroup.vue'
import LiveComposer from './LiveComposer.vue'
import LiveStatusBadge from './LiveStatusBadge.vue'
import PermissionCard from './PermissionCard.vue'

/**
 * Nouvelle session dans le projet sélectionné (F05). Dès que la session est importée dans l'historique,
 * la vue cède la place à son compte rendu.
 */
const router = useRouter()
const { t } = useI18n()
const live = useLiveStore()
const notices = useNoticesStore()
const { selectedProject } = storeToRefs(useHistoryStore())
const macos = computed(() => useAppStatusStore().info?.platform === 'darwin')

const runId = ref<string | undefined>()
const run = computed(() => (runId.value === undefined ? undefined : live.byRunId(runId.value)))
const blocks = computed(() => (run.value === undefined ? [] : groupTimeline(live.entriesOf(run.value))))

async function submit(text: string, model: ModelChoiceDto | undefined): Promise<void> {
  const project = selectedProject.value
  if (project === undefined) return
  await notices.attempt(async () => {
    if (run.value !== undefined && run.value.status !== 'ended') await live.send(run.value.runId, text)
    else runId.value = await live.start(project.id, text, model)
  })
}

function answer(requestId: string, decision: 'allow' | 'allow-session' | 'deny'): void {
  const current = run.value
  if (current !== undefined) void notices.attempt(() => live.answer(current.runId, requestId, decision))
}

/** Bascule vers le compte rendu dès que l'indexeur a importé la session. */
async function openWhenImported(): Promise<void> {
  const externalId = run.value?.sessionExternalId
  if (externalId === null || externalId === undefined) return
  const { sessionId } = unwrap<'sessions.findByExternal'>(await argos.invoke('sessions.findByExternal', { externalId }))
  if (sessionId !== null) await router.replace({ name: 'session', params: { id: sessionId } })
}

watch(
  () => run.value?.sessionExternalId,
  () => void notices.attempt(openWhenImported),
)
const stopWatching = argos.on('index.updated', () => void notices.attempt(openWhenImported))
watch(selectedProject, () => {
  if (runId.value === undefined) return
  stopWatching()
})
</script>

<template>
  <div class="new">
    <UiEmptyState v-if="selectedProject === undefined" :title="t('live.noProject')" />
    <template v-else>
      <header class="new__header">
        <UiMarker :label="t('live.newMarker', { project: selectedProject.name })" />
        <h1 class="new__title">{{ t('live.newTitle') }}</h1>
        <p class="new__meta">
          <LiveStatusBadge v-if="run" :status="run.status" />
          <span>{{ selectedProject.path }}</span>
        </p>
      </header>
      <div class="new__timeline">
        <template v-for="block in blocks" :key="block.number">
          <TimelineMessage v-if="block.type === 'message'" :number="block.number" :entry="block.entry" />
          <TimelineToolGroup
            v-else
            :number="block.number"
            :entries="block.entries"
            :counts="block.counts"
            :errors="block.errors"
            :project-path="selectedProject.path"
          />
        </template>
        <p v-if="run && (run.status === 'starting' || run.status === 'running')" class="new__note">
          {{ t('live.working') }}
        </p>
        <PermissionCard
          v-for="request in run?.pendingPermissions ?? []"
          :key="request.requestId"
          :request="request"
          :project-path="selectedProject.path"
          @answer="(decision) => answer(request.requestId, decision)"
        />
      </div>
      <div class="new__composer">
        <LiveComposer :macos="macos" @submit="submit" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.new {
  max-width: var(--size-document);
  margin: 0 auto;
  padding: 0 24px;
}

.new__header {
  padding: 28px 0 20px;
  border-bottom: 1px solid var(--rule);
}

.new__title {
  margin: 10px 0 8px;
  font-size: var(--size-title);
  font-weight: 600;
}

.new__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx3);
}

.new__note {
  padding: 24px 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx3);
  text-align: center;
}

.new__composer {
  position: sticky;
  bottom: 0;
  padding: 12px 0 20px;
  background: linear-gradient(to bottom, transparent, var(--bg) 18px);
}
</style>
