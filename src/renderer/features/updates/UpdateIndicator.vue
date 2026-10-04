<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAppStatusStore } from '../../stores/app-status'
import { useNoticesStore } from '../../stores/notices'
import { useUpdateText } from './update-text'

/** Nouvelle version dans la barre d'état (F09) : « Télécharger » ou « Redémarrer pour l'installer ». */
const { t } = useI18n()
const appStatus = useAppStatusStore()
const notices = useNoticesStore()
const { update } = storeToRefs(appStatus)
const text = useUpdateText()
</script>

<template>
  <span v-if="update.kind === 'available' || update.kind === 'downloading' || update.kind === 'ready'" class="update">
    <span>{{ text }}</span>
    <button
      v-if="update.kind === 'ready' || (update.kind === 'available' && update.mode === 'manual')"
      type="button"
      class="update__action"
      @click="notices.attempt(() => appStatus.installUpdate())"
    >
      {{ t(update.kind === 'ready' ? 'updates.restart' : 'updates.download') }}
    </button>
  </span>
</template>

<style scoped>
.update {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--tx2);
}

.update__action {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--acc);
  cursor: pointer;
}

.update__action:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
