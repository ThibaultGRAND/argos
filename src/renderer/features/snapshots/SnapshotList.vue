<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { SnapshotDto } from '@shared/contract'
import { useNoticesStore } from '../../stores/notices'
import { useSnapshotsStore } from '../../stores/snapshots'
import UiConfirm from '../../ui/UiConfirm.vue'
import { formatTime } from '../../utils/format'

/** Panneau E : snapshots de la session, avec « ↺ revenir » (F06). */
const { t, locale } = useI18n()
const store = useSnapshotsStore()
const notices = useNoticesStore()
const { snapshots, available } = storeToRefs(store)

const pending = ref<SnapshotDto | undefined>()

async function confirmRestore(): Promise<void> {
  const target = pending.value
  pending.value = undefined
  if (target === undefined) return
  await notices.attempt(async () => {
    await store.restore(target.id)
    notices.show({ messageKey: 'snapshots.restored', params: { ordinal: target.ordinal }, tone: 'info' })
  })
}

defineExpose({ ask: (snapshot: SnapshotDto) => (pending.value = snapshot) })
</script>

<template>
  <div class="snapshots">
    <p v-if="!available" class="snapshots__empty">{{ t('snapshots.unavailable') }}</p>
    <p v-else-if="snapshots.length === 0" class="snapshots__empty">{{ t('snapshots.none') }}</p>
    <ol v-else class="snapshots__list">
      <li v-for="snapshot in [...snapshots].reverse()" :key="snapshot.id" class="snapshots__item">
        <span class="snapshots__id">S{{ snapshot.ordinal }}</span>
        <span class="snapshots__info">
          <span class="snapshots__kind"
            >{{ t(`snapshots.${snapshot.kind}`) }} · {{ formatTime(snapshot.createdAt, locale) }}</span
          >
          <span v-if="snapshot.kind !== 'baseline'" class="snapshots__delta">
            {{ t('snapshots.files', { count: snapshot.filesChanged }) }} +{{ snapshot.linesAdded }} −{{
              snapshot.linesRemoved
            }}
          </span>
        </span>
        <button type="button" class="snapshots__restore" @click="pending = snapshot">
          {{ t('snapshots.restore') }}
        </button>
      </li>
    </ol>
    <UiConfirm
      v-if="pending"
      :title="t('snapshots.confirmTitle', { ordinal: pending.ordinal })"
      :body="t('snapshots.confirmBody', { time: formatTime(pending.createdAt, locale) })"
      :confirm-label="t('snapshots.confirm')"
      :cancel-label="t('snapshots.cancel')"
      @confirm="confirmRestore"
      @cancel="pending = undefined"
    />
  </div>
</template>

<style scoped>
.snapshots__empty {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--tx3);
}

.snapshots__list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.snapshots__item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--rule);
}

.snapshots__id {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 22px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx2);
}

.snapshots__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 11px;
}

.snapshots__kind {
  color: var(--tx2);
}

.snapshots__delta {
  color: var(--tx3);
}

.snapshots__restore {
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: none;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
  cursor: pointer;
}

.snapshots__restore:hover {
  border-color: var(--acc);
  color: var(--acc);
}
</style>
