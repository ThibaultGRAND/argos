<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useNoticesStore } from '../../stores/notices'
import { useSnapshotsStore } from '../../stores/snapshots'
import UiConfirm from '../../ui/UiConfirm.vue'

/** Confirmation commune à tous les retours en arrière (fichier, tour, session). */
const { t } = useI18n()
const store = useSnapshotsStore()
const notices = useNoticesStore()
const { request } = storeToRefs(store)

async function confirm(): Promise<void> {
  const current = store.dismiss()
  if (current === undefined) return
  await notices.attempt(async () => {
    await store.restore(current.action)
    notices.show({ messageKey: current.doneKey, params: { ...current.params }, tone: 'info' })
  })
}
</script>

<template>
  <UiConfirm
    v-if="request"
    :title="t(request.titleKey, { ...request.params })"
    :body="t(request.bodyKey, { ...request.params })"
    :confirm-label="t('snapshots.confirm')"
    :cancel-label="t('snapshots.cancel')"
    @confirm="confirm"
    @cancel="store.dismiss()"
  />
</template>
