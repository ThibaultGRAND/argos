<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { FileDiffDto, ReviewRangeDto, SessionDetailDto } from '@shared/contract'
import { useNoticesStore } from '../../stores/notices'
import { useReviewStore } from '../../stores/review'
import { useSnapshotsStore } from '../../stores/snapshots'
import UiEmptyState from '../../ui/UiEmptyState.vue'
import { formatTime } from '../../utils/format'
import FileDiffView from './FileDiffView.vue'

/**
 * Onglet Review (features/agent_changes.md) : travail de l'agent sur une plage (toute la session, depuis la dernière
 * review, un tour), commentaires, envoi à l'agent, « Marquer comme relu », autres modifications repliées.
 */
const props = defineProps<{ detail: SessionDetailDto }>()
const { t, locale } = useI18n()
const review = useReviewStore()
const snapshots = useSnapshotsStore()
const notices = useNoticesStore()
const { diff, pending, loading, range, focusFile } = storeToRefs(review)

/** Valeur du choix de plage : `session`, `since-review` ou l'identifiant de la capture d'un tour. */
const reviewedCount = computed(() => diff.value?.files.filter((file) => file.reviewed).length ?? 0)

const rangeValue = computed(() => (range.value.kind === 'turn' ? range.value.snapshotId : range.value.kind))

const turnOptions = computed(() =>
  [...(diff.value?.turns ?? [])].reverse().map((turn) => ({
    value: turn.snapshotId,
    label: t('review.ranges.turn', {
      time: formatTime(turn.createdAt, locale.value),
      label: turn.label ?? t('snapshots.turnFallback', { time: formatTime(turn.createdAt, locale.value) }),
    }),
  })),
)

function changeRange(value: string): void {
  const next: ReviewRangeDto =
    value === 'session' || value === 'since-review' ? { kind: value } : { kind: 'turn', snapshotId: value }
  void notices.attempt(() => review.load(props.detail.externalId, next))
}

const anchor = (path: string): string => `review-file-${encodeURIComponent(path)}`

function scrollToFile(path: string): void {
  document.getElementById(anchor(path))?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

// Review ouverte depuis le panneau D sur un fichier : on l'amène sous les yeux une fois le diff chargé.
watch(
  () => [focusFile.value, diff.value] as const,
  async ([path, loaded]) => {
    if (path === undefined || loaded === undefined) return
    await nextTick()
    scrollToFile(path)
    focusFile.value = undefined
  },
)

function restoreFile(file: FileDiffDto): void {
  const fromId = diff.value?.fromId
  if (fromId == null) return
  const whenKey = range.value.kind === 'session' ? 'snapshots.whenSessionStart' : 'snapshots.whenRangeStart'
  snapshots.ask({
    action: {
      kind: 'files',
      snapshotId: fromId,
      paths: file.oldPath === null ? [file.path] : [file.path, file.oldPath],
    },
    titleKey: 'snapshots.confirmFileTitle',
    bodyKey: 'snapshots.confirmFileBody',
    doneKey: 'snapshots.fileRestored',
    params: { file: file.path, when: t(whenKey) },
  })
}

function markReviewed(): void {
  void notices.attempt(async () => {
    await review.markReviewed()
    notices.show({ messageKey: 'review.markedNotice', tone: 'info' })
  })
}

function send(): void {
  void notices.attempt(async () => {
    await review.send(props.detail.id)
    notices.show({ messageKey: 'review.sentNotice', tone: 'info' })
  })
}
</script>

<template>
  <div class="review">
    <UiEmptyState v-if="diff && diff.turns.length === 0" size="small" :title="t('review.noSnapshots')" />
    <template v-else-if="diff">
      <div class="review__range">
        <label class="review__select">
          {{ t('review.range') }}
          <select :value="rangeValue" @change="changeRange(($event.target as HTMLSelectElement).value)">
            <option value="session">{{ t('review.ranges.session') }}</option>
            <option value="since-review" :disabled="!diff.sinceReviewAvailable && range.kind !== 'since-review'">
              {{ t('review.ranges.since-review') }}
            </option>
            <option v-for="option in turnOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <p v-if="range.kind === 'since-review' && diff.toId === null && !loading" class="review__note">
        {{ t('review.nothingSinceReview') }}
      </p>
      <p v-else-if="diff.files.length === 0 && !loading" class="review__note">{{ t('review.noChanges') }}</p>
      <p v-if="diff.truncated" class="review__note">{{ t('review.truncatedFiles') }}</p>

      <nav v-if="diff.files.length > 0" class="review__summary">
        <p class="review__summary-title">
          {{ t('review.summary', { count: diff.files.length }, diff.files.length) }} ·
          {{ t('review.reviewedCount', { done: reviewedCount, total: diff.files.length }) }}
        </p>
        <button
          v-for="file in diff.files"
          :key="file.path"
          type="button"
          class="review__summary-file"
          @click="scrollToFile(file.path)"
        >
          <span class="review__summary-check" aria-hidden="true">{{ file.reviewed ? '✓' : '' }}</span>
          <span class="review__summary-path" :class="{ 'review__summary-path--done': file.reviewed }">{{
            file.path
          }}</span>
          <span class="review__summary-delta">+{{ file.additions }} −{{ file.deletions }}</span>
        </button>
      </nav>

      <FileDiffView
        v-for="file in diff.files"
        :id="anchor(file.path)"
        :key="file.path"
        :file="file"
        :project-path="detail.projectPath"
        :snapshot-id="diff.toId"
        :restorable="diff.fromId !== null"
        :reviewable="true"
        @restore="restoreFile(file)"
      />

      <details v-if="diff.otherFiles.length > 0" class="review__other">
        <summary>{{ t('review.otherChanges', { count: diff.otherFiles.length }) }}</summary>
        <p class="review__note">{{ t('review.otherHint') }}</p>
        <FileDiffView
          v-for="file in diff.otherFiles"
          :id="anchor(file.path)"
          :key="file.path"
          :file="file"
          :project-path="detail.projectPath"
          :snapshot-id="null"
          :restorable="false"
          :reviewable="false"
        />
      </details>
    </template>

    <div v-if="diff && diff.toId !== null" class="review__bar">
      <span class="review__pending">
        <template v-if="pending.length > 0">{{
          t('review.pending', { count: pending.length }, pending.length)
        }}</template>
      </span>
      <span class="review__actions">
        <button type="button" class="review__secondary" @click="markReviewed">{{ t('review.markReviewed') }}</button>
        <button v-if="pending.length > 0" type="button" class="review__send" @click="send">
          {{ t('review.send') }}
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.review {
  padding: 8px 0 24px;
}

.review__range {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}

.review__select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.review__select select {
  max-width: 480px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--input);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx2);
  text-transform: none;
}

.review__note {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx3);
}

.review__summary {
  display: flex;
  flex-direction: column;
  margin: 4px 0 16px;
  padding: 10px 12px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}

.review__summary-title {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx3);
}

.review__summary-file {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  border: 0;
  background: none;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx2);
  text-align: left;
  cursor: pointer;
}

.review__summary-file:hover .review__summary-path {
  color: var(--acc);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.review__summary-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review__summary-check {
  flex: none;
  width: 12px;
  color: var(--tx2);
}

.review__summary-path--done {
  color: var(--tx3);
}

.review__summary-delta {
  flex: none;
  color: var(--tx3);
}

.review__other {
  margin-top: 24px;
}

.review__other summary {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx3);
  cursor: pointer;
}

.review__bar {
  position: sticky;
  bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 10px 14px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: var(--raised);
}

.review__pending {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx2);
}

.review__actions {
  display: flex;
  gap: 8px;
}

.review__secondary {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: none;
  color: var(--tx2);
  cursor: pointer;
}

.review__secondary:hover {
  border-color: var(--tx3);
  color: var(--tx);
}

.review__send {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--acc);
  border-radius: var(--radius);
  background: var(--acc);
  color: var(--bg);
  font-weight: 500;
  cursor: pointer;
}
</style>
