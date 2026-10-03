<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SessionDetailDto } from '@shared/contract'
import { storeToRefs } from 'pinia'
import { openInEditor } from '../../services/editor'
import { useNoticesStore } from '../../stores/notices'
import { usePreferencesStore } from '../../stores/preferences'
import UiButton from '../../ui/UiButton.vue'
import UiMarker from '../../ui/UiMarker.vue'
import { formatDuration, formatModel } from '../../utils/format'

/** En-tête façon fiche : repère, titre en grand, métadonnées en monospace. */
const props = defineProps<{ detail: SessionDetailDto }>()
const { t } = useI18n()
const notices = useNoticesStore()
const { preferences } = storeToRefs(usePreferencesStore())

const openLabel = computed(() => t('editor.openIn', { editor: t(`editors.${preferences.value.editor}`) }))

function openProject(): void {
  void notices.attempt(() => openInEditor(props.detail.projectPath))
}

const marker = computed(() =>
  t('document.sessionMarker', { id: props.detail.externalId.slice(0, 8), project: props.detail.projectName }),
)
const meta = computed(() =>
  [
    t(`providers.${props.detail.providerId}`),
    props.detail.model === null ? undefined : formatModel(props.detail.model),
    formatDuration(props.detail.startedAt, props.detail.lastActivityAt),
    t('document.filesCount', { count: props.detail.filesChanged }, props.detail.filesChanged),
  ]
    .filter((part) => part !== undefined)
    .join(' · '),
)
</script>

<template>
  <header class="header">
    <div class="header__top">
      <UiMarker :label="marker" />
      <UiButton @click="openProject">{{ openLabel }}</UiButton>
    </div>
    <h1 class="header__title" :class="{ 'header__title--untitled': detail.title === null }">
      {{ detail.title ?? t('sessions.untitled') }}
    </h1>
    <p class="header__meta">
      <span>{{ meta }}</span>
      <span v-if="detail.filesChanged > 0" class="header__changes">
        <span class="header__added">+{{ detail.linesAdded }}</span>
        <span>−{{ detail.linesRemoved }}</span>
      </span>
    </p>
  </header>
</template>

<style scoped>
.header {
  padding: 28px 0 20px;
  border-bottom: 1px solid var(--rule);
}

.header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header__title {
  margin: 10px 0 8px;
  font-size: var(--size-title);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  user-select: text;
}

.header__title--untitled {
  color: var(--tx2);
  font-style: italic;
}

.header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--tx2);
}

.header__changes {
  display: inline-flex;
  gap: 8px;
}

.header__added {
  color: var(--tx);
}
</style>
