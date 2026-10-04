<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ChangedFileDto, SessionChangesDto } from '@shared/contract'
import { openInEditor } from '../../services/editor'
import { useNoticesStore } from '../../stores/notices'
import { useReviewStore } from '../../stores/review'
import { useSnapshotsStore } from '../../stores/snapshots'
import { joinProjectPath } from '../../utils/format'

/**
 * Panneau D. Modifications (features/agent_changes.md) : ce que l'agent a changé depuis le début de la session,
 * les autres modifications, et les retours en arrière.
 */
const props = defineProps<{ changes: SessionChangesDto; projectPath: string; sessionExternalId: string }>()
const { t } = useI18n()
const review = useReviewStore()
const snapshots = useSnapshotsStore()
const notices = useNoticesStore()

const statusLetter = { added: 'A', modified: 'M', deleted: 'D', renamed: 'R' } as const

function openFile(file: ChangedFileDto): void {
  void notices.attempt(() => review.open({ kind: 'session' }, file.path))
}

function editFile(file: ChangedFileDto): void {
  void notices.attempt(() => openInEditor(joinProjectPath(props.projectPath, file.path)))
}

function restoreFile(file: ChangedFileDto): void {
  const startId = props.changes.startId
  if (startId === null) return
  snapshots.ask({
    action: {
      kind: 'files',
      snapshotId: startId,
      paths: file.oldPath === null ? [file.path] : [file.path, file.oldPath],
    },
    titleKey: 'snapshots.confirmFileTitle',
    bodyKey: 'snapshots.confirmFileBody',
    doneKey: 'snapshots.fileRestored',
    params: { file: file.path, when: t('snapshots.whenSessionStart') },
  })
}

function revertAll(): void {
  snapshots.ask({
    action: { kind: 'session-start', sessionExternalId: props.sessionExternalId },
    titleKey: 'snapshots.confirmAllTitle',
    bodyKey: 'snapshots.confirmAllBody',
    doneKey: 'snapshots.restored',
  })
}

function undo(): void {
  // Un retour annulé reste lui-même annulable : pas de confirmation.
  void notices.attempt(async () => {
    await snapshots.restore({ kind: 'undo', sessionExternalId: props.sessionExternalId })
    notices.show({ messageKey: 'snapshots.undone', tone: 'info' })
  })
}
</script>

<template>
  <div class="changes">
    <p v-if="!changes.available" class="changes__empty">{{ t('snapshots.unavailable') }}</p>
    <template v-else>
      <div v-if="changes.undoableId" class="changes__banner">
        <span>{{ t('snapshots.restoredBanner') }}</span>
        <button type="button" class="changes__link" @click="undo">{{ t('snapshots.undo') }}</button>
      </div>

      <p v-if="changes.agentFiles.length === 0" class="changes__empty">{{ t('snapshots.noChanges') }}</p>
      <ul v-else class="changes__files">
        <li v-for="file in changes.agentFiles" :key="file.path" class="changes__file">
          <button type="button" class="changes__main" :title="file.path" @click="openFile(file)">
            <span class="changes__status" :class="`changes__status--${file.status}`">{{
              statusLetter[file.status]
            }}</span>
            <span class="changes__path">{{ file.path }}</span>
            <span class="changes__delta">+{{ file.additions }} −{{ file.deletions }}</span>
          </button>
          <span v-if="file.alsoOutside" class="changes__mention">{{ t('snapshots.alsoOutside') }}</span>
          <span class="changes__actions">
            <button v-if="file.status !== 'deleted'" type="button" class="changes__link" @click="editFile(file)">
              {{ t('review.openFile') }}
            </button>
            <button type="button" class="changes__link changes__link--danger" @click="restoreFile(file)">
              {{ t('snapshots.restoreFile') }}
            </button>
          </span>
        </li>
      </ul>
      <p v-if="changes.truncated" class="changes__empty">{{ t('snapshots.truncated') }}</p>

      <details v-if="changes.otherFiles.length > 0" class="changes__other">
        <summary>{{ t('snapshots.otherChanges', { count: changes.otherFiles.length }) }}</summary>
        <p class="changes__hint">{{ t('snapshots.otherHint') }}</p>
        <ul class="changes__files">
          <li v-for="file in changes.otherFiles" :key="file.path" class="changes__file">
            <button type="button" class="changes__main" :title="file.path" @click="openFile(file)">
              <span class="changes__status">{{ statusLetter[file.status] }}</span>
              <span class="changes__path">{{ file.path }}</span>
              <span class="changes__delta">+{{ file.additions }} −{{ file.deletions }}</span>
            </button>
          </li>
        </ul>
      </details>

      <footer v-if="changes.turns.length > 0 || changes.agentFiles.length > 0" class="changes__footer">
        <button type="button" class="changes__button" @click="notices.attempt(() => review.open({ kind: 'session' }))">
          {{ t('snapshots.reviewAll') }}
        </button>
        <button
          v-if="changes.agentFiles.length > 0 || changes.otherFiles.length > 0"
          type="button"
          class="changes__button changes__button--danger"
          @click="revertAll"
        >
          {{ t('snapshots.revertAll') }}
        </button>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.changes__empty,
.changes__hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--tx3);
}

.changes__hint {
  font-size: 12px;
}

.changes__banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding: 6px 8px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  font-size: 12px;
  color: var(--tx2);
}

.changes__files {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.changes__file {
  padding: 3px 0;
}

.changes__main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx);
  text-align: left;
  cursor: pointer;
}

.changes__main:hover .changes__path {
  color: var(--acc);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.changes__status {
  color: var(--tx3);
}

.changes__status--added {
  color: var(--code-string);
}

.changes__status--deleted {
  color: var(--acc);
}

.changes__path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  direction: rtl;
  text-align: left;
}

.changes__delta {
  color: var(--tx3);
}

.changes__mention {
  display: block;
  padding-left: 18px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--caution);
}

.changes__actions {
  display: none;
  gap: 10px;
  padding-left: 18px;
}

.changes__file:hover .changes__actions,
.changes__file:focus-within .changes__actions {
  display: flex;
}

.changes__link {
  padding: 0;
  border: 0;
  background: none;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx2);
  cursor: pointer;
}

.changes__link:hover {
  color: var(--tx);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.changes__link--danger:hover {
  color: var(--acc);
}

.changes__other {
  margin-top: 12px;
  font-size: 12px;
  color: var(--tx2);
}

.changes__other summary {
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
}

.changes__footer {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.changes__button {
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: none;
  font-size: 12px;
  color: var(--tx2);
  cursor: pointer;
}

.changes__button:hover {
  border-color: var(--tx3);
  color: var(--tx);
}

.changes__button--danger:hover {
  border-color: var(--acc);
  color: var(--acc);
}
</style>
