<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { EditorDto, EnvironmentDto, PreferencesDto } from '@shared/contract'
import { argos, unwrap } from '../../services/argos'
import { useAppStatusStore } from '../../stores/app-status'
import { useNoticesStore } from '../../stores/notices'
import { usePreferencesStore } from '../../stores/preferences'
import UiButton from '../../ui/UiButton.vue'
import UiMarker from '../../ui/UiMarker.vue'
import { shortenPath } from '../../utils/format'

/** Écran Paramètres (F16), dans la mise en page du document C1. */
const router = useRouter()
const { t } = useI18n()
const preferencesStore = usePreferencesStore()
const notices = useNoticesStore()
const { preferences } = storeToRefs(preferencesStore)
const { info } = storeToRefs(useAppStatusStore())

const themes: readonly PreferencesDto['theme'][] = ['dark', 'light', 'system']
const languages: readonly PreferencesDto['language'][] = ['fr', 'en']
const editors: readonly EditorDto[] = ['vscode', 'vscode-insiders', 'cursor', 'vscodium']

const environment = ref<EnvironmentDto | undefined>()

async function loadEnvironment(): Promise<void> {
  await notices.attempt(async () => {
    environment.value = unwrap<'settings.environment'>(await argos.invoke('settings.environment'))
  })
}

function update(changes: Partial<PreferencesDto>): void {
  void notices.attempt(() => preferencesStore.update(changes))
}

function rebuild(): void {
  void notices.attempt(async () => {
    unwrap<'index.rebuild'>(await argos.invoke('index.rebuild'))
    notices.show({ messageKey: 'settings.rebuildStarted', tone: 'info' })
  })
}

function back(): void {
  if (window.history.length > 1) router.back()
  else void router.push({ name: 'home' })
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') back()
}

let stopWatching: (() => void) | undefined
onMounted(() => {
  void loadEnvironment()
  window.addEventListener('keydown', onKeydown)
  // Le nombre de sessions suit l'index (import, reconstruction).
  stopWatching = argos.on('index.updated', () => void loadEnvironment())
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  stopWatching?.()
})
</script>

<template>
  <div class="settings">
    <header class="settings__header">
      <UiButton variant="ghost" shortcut="Esc" @click="back">← {{ t('settings.back') }}</UiButton>
      <h1 class="settings__title">{{ t('settings.title') }}</h1>
    </header>

    <section class="settings__section">
      <UiMarker :label="t('settings.sections.appearance')" />
      <div class="settings__row">
        <span class="settings__label">{{ t('settings.theme') }}</span>
        <div class="settings__choices">
          <button
            v-for="theme in themes"
            :key="theme"
            type="button"
            class="settings__choice"
            :class="{ 'settings__choice--active': preferences.theme === theme }"
            @click="update({ theme })"
          >
            {{ t(`status.theme.${theme}`) }}
          </button>
        </div>
      </div>
      <div class="settings__row">
        <span class="settings__label">{{ t('settings.language') }}</span>
        <div class="settings__choices">
          <button
            v-for="language in languages"
            :key="language"
            type="button"
            class="settings__choice"
            :class="{ 'settings__choice--active': preferences.language === language }"
            @click="update({ language })"
          >
            {{ t(`status.language.${language}`) }}
          </button>
        </div>
      </div>
    </section>

    <section class="settings__section">
      <UiMarker :label="t('settings.sections.notifications')" />
      <div class="settings__row">
        <span class="settings__label">
          {{ t('settings.notifications') }}
          <span class="settings__help">{{ t('settings.notificationsHelp') }}</span>
        </span>
        <div class="settings__choices">
          <button
            v-for="enabled in [true, false]"
            :key="String(enabled)"
            type="button"
            class="settings__choice"
            :class="{ 'settings__choice--active': preferences.notifications === enabled }"
            @click="update({ notifications: enabled })"
          >
            {{ t(enabled ? 'settings.on' : 'settings.off') }}
          </button>
        </div>
      </div>
    </section>

    <section class="settings__section">
      <UiMarker :label="t('settings.sections.editor')" />
      <div class="settings__row">
        <span class="settings__label">{{ t('settings.editorLabel') }}</span>
        <div class="settings__choices">
          <button
            v-for="editor in editors"
            :key="editor"
            type="button"
            class="settings__choice"
            :class="{ 'settings__choice--active': preferences.editor === editor }"
            @click="update({ editor })"
          >
            {{ t(`editors.${editor}`) }}
          </button>
        </div>
      </div>
    </section>

    <section class="settings__section">
      <UiMarker :label="t('settings.sections.sources')" />
      <div v-for="source in environment?.sources ?? []" :key="source.providerId" class="settings__row">
        <span class="settings__label">{{ t(`providers.${source.providerId}`) }}</span>
        <span class="settings__value">
          <template v-if="source.status === 'available'">
            {{ t('settings.sourceStatus.available', { count: source.sessionCount }, source.sessionCount) }}
            <span v-if="source.directory" class="settings__path">{{ shortenPath(source.directory, 60) }}</span>
          </template>
          <template v-else>{{ t(`settings.sourceStatus.${source.status}`) }}</template>
        </span>
      </div>
    </section>

    <section class="settings__section">
      <UiMarker :label="t('settings.sections.data')" />
      <div class="settings__row">
        <span class="settings__label">{{ t('settings.dataDirectory') }}</span>
        <span class="settings__value settings__path">{{
          environment ? shortenPath(environment.dataDirectory, 60) : ''
        }}</span>
      </div>
      <div class="settings__row">
        <span class="settings__label">
          {{ t('settings.rebuild') }}
          <span class="settings__help">{{ t('settings.rebuildHelp') }}</span>
        </span>
        <UiButton @click="rebuild">{{ t('settings.rebuild') }}</UiButton>
      </div>
    </section>

    <section class="settings__section">
      <UiMarker :label="t('settings.sections.about')" />
      <div class="settings__row">
        <span class="settings__label">{{ t('settings.version') }}</span>
        <span class="settings__value">{{ info?.version }}</span>
      </div>
      <div class="settings__row">
        <span class="settings__label">{{ t('settings.license') }}</span>
        <span class="settings__value">{{ t('settings.licenseValue') }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings {
  max-width: var(--size-document);
  margin: 0 auto;
  padding: 20px 24px 64px;
}

.settings__header {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--rule);
}

.settings__title {
  margin: 14px 0 0;
  font-size: var(--size-title);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.settings__section {
  padding: 22px 0 8px;
  border-bottom: 1px solid var(--rule);
}

.settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 12px 0;
}

.settings__row + .settings__row {
  border-top: 1px solid var(--rule);
}

.settings__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings__help {
  max-width: 420px;
  font-size: 12px;
  color: var(--tx3);
}

.settings__value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--tx2);
  text-align: right;
}

.settings__path {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
  user-select: text;
}

.settings__choices {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.settings__choice {
  padding: 4px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: none;
  font-size: 13px;
  color: var(--tx2);
  cursor: pointer;
}

.settings__choice:hover {
  border-color: var(--rule2);
}

.settings__choice--active {
  border-color: var(--tx2);
  color: var(--tx);
  background: var(--sel-bg);
}
</style>
