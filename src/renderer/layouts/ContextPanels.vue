<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { openInEditor } from '../services/editor'
import { useNoticesStore } from '../stores/notices'
import { usePreferencesStore } from '../stores/preferences'
import { useSessionStore } from '../stores/session'
import UiMarker from '../ui/UiMarker.vue'
import { formatDateTime, formatDuration, formatModel, relativeToProject } from '../utils/format'

/** Colonne de droite 2a : D. Fichiers, E. Snapshots (V1), F. Fiche de la session ouverte. */
const { detail } = storeToRefs(useSessionStore())
const { t, locale } = useI18n()
const notices = useNoticesStore()
const { preferences } = storeToRefs(usePreferencesStore())

function openFile(path: string): void {
  void notices.attempt(() => openInEditor(path))
}

const fileTitle = (path: string): string =>
  t('editor.openFile', { file: path, editor: t(`editors.${preferences.value.editor}`) })

const sheet = computed(() => {
  const session = detail.value
  if (session === undefined) return []
  return [
    ['provider', t(`providers.${session.providerId}`)],
    ['model', session.model === null ? '—' : formatModel(session.model)],
    ['branch', session.gitBranch ?? '—'],
    ['cliVersion', session.cliVersion ?? '—'],
    ['startedAt', formatDateTime(session.startedAt, locale.value)],
    ['duration', formatDuration(session.startedAt, session.lastActivityAt)],
    ['messages', session.messageCount.toLocaleString(locale.value)],
    ['toolCalls', session.toolCallCount.toLocaleString(locale.value)],
    ['identifier', session.externalId],
  ] as const
})
</script>

<template>
  <aside class="panels">
    <section class="panels__section">
      <UiMarker :label="t('panel.files')" />
      <template v-if="detail">
        <ul v-if="detail.files.length > 0" class="panels__files">
          <li v-for="file in detail.files" :key="file.path">
            <button
              type="button"
              class="panels__file panels__file--link"
              :title="fileTitle(file.path)"
              @click="openFile(file.path)"
            >
              <span class="panels__path">{{ relativeToProject(file.path, detail.projectPath) }}</span>
              <span class="panels__delta">+{{ file.linesAdded }} −{{ file.linesRemoved }}</span>
            </button>
          </li>
          <li class="panels__file panels__file--total">
            <span>{{ t('panel.total') }}</span>
            <span class="panels__delta">+{{ detail.linesAdded }} −{{ detail.linesRemoved }}</span>
          </li>
        </ul>
        <p v-else class="panels__empty">{{ t('panel.noFiles') }}</p>
      </template>
      <p v-else class="panels__empty">{{ t('panel.empty') }}</p>
    </section>

    <section class="panels__section">
      <UiMarker :label="t('panel.snapshots')" />
      <p class="panels__empty">{{ detail ? t('panel.snapshotsSoon') : t('panel.empty') }}</p>
    </section>

    <section class="panels__section">
      <UiMarker :label="t('panel.sheet')" />
      <dl v-if="detail" class="panels__sheet">
        <template v-for="[key, value] in sheet" :key="key">
          <dt>{{ t(`panel.sheetFields.${key}`) }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
      <p v-else class="panels__empty">{{ t('panel.empty') }}</p>
    </section>
  </aside>
</template>

<style scoped>
.panels {
  grid-area: panels;
  min-height: 0;
  overflow-y: auto;
  border-left: 1px solid var(--rule);
}

.panels__section {
  padding: 16px;
  border-bottom: 1px solid var(--rule);
}

.panels__empty {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--tx3);
}

.panels__files {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.panels__file {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
  font-family: var(--font-mono);
  font-size: 12px;
}

.panels__file--link {
  width: 100%;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.panels__file--link:hover .panels__path {
  color: var(--acc);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.panels__file--total {
  margin-top: 4px;
  border-top: 1px solid var(--rule);
  padding-top: 8px;
  color: var(--tx3);
}

.panels__path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: text;
}

.panels__delta {
  flex: none;
  color: var(--tx3);
}

.panels__sheet {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 12px;
  margin: 10px 0 0;
  font-size: 12px;
}

.panels__sheet dt {
  color: var(--tx3);
}

.panels__sheet dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-mono);
  color: var(--tx2);
  user-select: text;
}
</style>
