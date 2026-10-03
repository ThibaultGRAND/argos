<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { SessionDetailDto } from '@shared/contract'
import { useNoticesStore } from '../../stores/notices'
import { useReviewStore } from '../../stores/review'
import UiEmptyState from '../../ui/UiEmptyState.vue'
import FileDiffView from './FileDiffView.vue'

/** Onglet Review (F07) : changements entre deux snapshots, commentaires, envoi à l'agent. */
const props = defineProps<{ detail: SessionDetailDto }>()
const { t } = useI18n()
const review = useReviewStore()
const notices = useNoticesStore()
const { diff, pending, loading } = storeToRefs(review)

const snapshotOptions = computed(() => diff.value?.snapshots ?? [])

function changeRange(which: 'from' | 'to', id: string): void {
  const current = diff.value
  if (current === undefined) return
  const fromId = which === 'from' ? id : (current.fromId ?? undefined)
  const toId = which === 'to' ? id : (current.toId ?? undefined)
  void notices.attempt(() => review.load(props.detail.externalId, fromId, toId))
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
    <UiEmptyState v-if="diff && diff.snapshots.length < 2" size="small" :title="t('review.noSnapshots')" />
    <template v-else-if="diff">
      <div class="review__range">
        <label class="review__select">
          {{ t('review.from') }}
          <select :value="diff.fromId ?? ''" @change="changeRange('from', ($event.target as HTMLSelectElement).value)">
            <option v-for="snapshot in snapshotOptions" :key="snapshot.id" :value="snapshot.id">
              {{ t('review.snapshot', { ordinal: snapshot.ordinal, kind: t(`snapshots.${snapshot.kind}`) }) }}
            </option>
          </select>
        </label>
        <span aria-hidden="true">→</span>
        <label class="review__select">
          {{ t('review.to') }}
          <select :value="diff.toId ?? ''" @change="changeRange('to', ($event.target as HTMLSelectElement).value)">
            <option v-for="snapshot in snapshotOptions" :key="snapshot.id" :value="snapshot.id">
              {{ t('review.snapshot', { ordinal: snapshot.ordinal, kind: t(`snapshots.${snapshot.kind}`) }) }}
            </option>
          </select>
        </label>
      </div>
      <p v-if="diff.files.length === 0 && !loading" class="review__note">{{ t('review.noChanges') }}</p>
      <p v-if="diff.truncated" class="review__note">{{ t('review.truncatedFiles') }}</p>
      <FileDiffView
        v-for="file in diff.files"
        :key="file.path"
        :file="file"
        :project-path="detail.projectPath"
        :snapshot-id="diff.toId"
      />
    </template>

    <div v-if="pending.length > 0" class="review__bar">
      <span class="review__pending">{{ t('review.pending', { count: pending.length }, pending.length) }}</span>
      <button type="button" class="review__send" @click="send">{{ t('review.send') }}</button>
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
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.review__select select {
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

.review__bar {
  position: sticky;
  bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 10px 14px;
  border: 1px solid var(--acc);
  border-radius: var(--radius);
  background: var(--raised);
}

.review__pending {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx2);
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
