<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import type { PreferencesDto } from '@shared/contract'
import { useAppStatusStore } from '../stores/app-status'
import { usePreferencesStore } from '../stores/preferences'

const appStatus = useAppStatusStore()
const preferencesStore = usePreferencesStore()
const { info, indexer } = storeToRefs(appStatus)
const { preferences } = storeToRefs(preferencesStore)

const themes: readonly PreferencesDto['theme'][] = ['dark', 'light', 'system']
const languages: readonly PreferencesDto['language'][] = ['fr', 'en']

const indexerTone = computed(() => (indexer.value === 'error' ? 'status__dot--accent' : ''))

function changeTheme(event: Event): void {
  const theme = themes.find((candidate) => candidate === (event.target as HTMLSelectElement).value)
  if (theme !== undefined) void preferencesStore.update({ theme })
}

function changeLanguage(event: Event): void {
  const language = languages.find((candidate) => candidate === (event.target as HTMLSelectElement).value)
  if (language !== undefined) void preferencesStore.update({ language })
}
</script>

<template>
  <footer class="status">
    <span class="status__item">
      <span class="status__dot" :class="indexerTone" />
      {{ $t(`status.indexer.${indexer}`) }}
    </span>

    <span class="status__spacer" />

    <label class="status__item">
      {{ $t('status.theme.label') }}
      <select class="status__select" :value="preferences.theme" @change="changeTheme">
        <option v-for="theme in themes" :key="theme" :value="theme">{{ $t(`status.theme.${theme}`) }}</option>
      </select>
    </label>

    <label class="status__item">
      {{ $t('status.language.label') }}
      <select class="status__select" :value="preferences.language" @change="changeLanguage">
        <option v-for="language in languages" :key="language" :value="language">
          {{ $t(`status.language.${language}`) }}
        </option>
      </select>
    </label>

    <span v-if="info" class="status__item">{{ $t('status.version', { version: info.version }) }}</span>
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

.status__select {
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--input);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx2);
}
</style>
