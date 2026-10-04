<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TurnChangeDto } from '@shared/contract'
import { useNoticesStore } from '../../stores/notices'
import { useReviewStore } from '../../stores/review'
import { useSnapshotsStore } from '../../stores/snapshots'
import { formatTime } from '../../utils/format'

/** Ligne discrète sous un tour qui a modifié des fichiers : résumé, Revoir, Revenir avant ce tour. */
const props = defineProps<{ turn: TurnChangeDto }>()
const { t, locale } = useI18n()
const review = useReviewStore()
const snapshots = useSnapshotsStore()
const notices = useNoticesStore()

const label = computed(
  () => props.turn.label ?? t('snapshots.turnFallback', { time: formatTime(props.turn.createdAt, locale.value) }),
)

function revert(): void {
  snapshots.ask({
    action: { kind: 'before-turn', snapshotId: props.turn.snapshotId },
    titleKey: 'snapshots.confirmTurnTitle',
    bodyKey: 'snapshots.confirmTurnBody',
    doneKey: 'snapshots.restored',
    params: { label: label.value },
  })
}
</script>

<template>
  <p class="turn">
    <span>{{ t('snapshots.turnLine', { count: turn.filesChanged }, turn.filesChanged) }}</span>
    <span class="turn__delta">+{{ turn.linesAdded }} −{{ turn.linesRemoved }}</span>
    <span aria-hidden="true">·</span>
    <button
      type="button"
      class="turn__action"
      @click="notices.attempt(() => review.open({ kind: 'turn', snapshotId: turn.snapshotId }))"
    >
      {{ t('snapshots.review') }}
    </button>
    <span aria-hidden="true">·</span>
    <button type="button" class="turn__action turn__action--danger" @click="revert">
      {{ t('snapshots.revertTurn') }}
    </button>
  </p>
</template>

<style scoped>
.turn {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 4px 0 18px;
  padding-left: 12px;
  border-left: 1px solid var(--rule2);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}

.turn__action {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--tx2);
  cursor: pointer;
}

.turn__action:hover {
  color: var(--tx);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.turn__action--danger:hover {
  color: var(--acc);
}
</style>
