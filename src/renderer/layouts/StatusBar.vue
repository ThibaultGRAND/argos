<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAppStatusStore } from '../stores/app-status'
import { useNoticesStore } from '../stores/notices'

/** Barre d'état : indexeur, message bref de la dernière action, version. */
const { t, te } = useI18n()
const { info, indexer } = storeToRefs(useAppStatusStore())
const { current: notice } = storeToRefs(useNoticesStore())

const indexerTone = computed(() => (indexer.value.state === 'error' ? 'status__dot--accent' : ''))
const indexerLabel = computed(() => {
  const { state, progress } = indexer.value
  return state === 'importing' && progress !== undefined
    ? t('status.indexer.importing', { done: progress.done, total: progress.total })
    : t(`status.indexer.${state === 'importing' ? 'ready' : state}`)
})
const noticeText = computed(() => {
  const key = notice.value?.messageKey
  if (key === undefined) return undefined
  return te(key) ? t(key) : t('errors.unknown')
})
</script>

<template>
  <footer class="status">
    <span class="status__item">
      <span class="status__dot" :class="indexerTone" />
      {{ indexerLabel }}
    </span>
    <span v-if="noticeText" class="status__notice" :class="{ 'status__notice--error': notice?.tone === 'error' }">
      {{ noticeText }}
    </span>
    <span class="status__spacer" />
    <span v-if="info" class="status__item">{{ t('status.version', { version: info.version }) }}</span>
  </footer>
</template>

<style scoped>
.status {
  grid-area: status;
  display: flex;
  align-items: center;
  gap: 18px;
  height: var(--size-statusbar);
  padding: 0 16px;
  border-top: 1px solid var(--rule);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}

.status__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status__spacer {
  flex: 1;
}

.status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tx3);
}

.status__dot--accent {
  background: var(--acc);
}

.status__notice {
  color: var(--tx2);
}

.status__notice--error {
  color: var(--acc);
}
</style>
