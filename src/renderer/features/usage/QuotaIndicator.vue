<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { QuotaWindowDto } from '@shared/contract'
import { useUsageStore } from '../../stores/usage'
import { formatReset } from '../../utils/format'

/** Quota de l'abonnement dans la barre d'état : fenêtre de 5 heures et semaine, détail au survol (F08). */
const { t, locale } = useI18n()
const { quota } = storeToRefs(useUsageStore())

/** Toujours la fenêtre de 5 heures et la semaine ; une fenêtre propre à un modèle seulement si elle alerte. */
const shown = computed(() =>
  (quota.value?.windows ?? []).filter((window) => window.kind !== 'weekly-model' || window.warning),
)

const shortName = (window: QuotaWindowDto): string =>
  window.kind === 'weekly-model' ? (window.label ?? '') : t(`usage.quota.${window.kind}`)

const title = computed(() =>
  [
    t('usage.quota.title'),
    ...(quota.value?.windows ?? []).map((window) =>
      t('usage.quota.line', {
        name: t(`usage.quota.names.${window.kind}`, { model: window.label ?? '' }),
        percent: window.utilization,
        reset:
          window.resetsAt === null ? '' : t('usage.quota.reset', { when: formatReset(window.resetsAt, locale.value) }),
      }),
    ),
  ].join('\n'),
)
</script>

<template>
  <span v-if="shown.length > 0" class="quota" :title="title">
    <span
      v-for="window in shown"
      :key="`${window.kind}-${window.label}`"
      class="quota__window"
      :class="{ 'quota__window--warning': window.warning }"
    >
      {{ shortName(window) }} {{ window.utilization }}&nbsp;%
    </span>
  </span>
</template>

<style scoped>
.quota {
  display: inline-flex;
  gap: 10px;
}

.quota__window--warning {
  color: var(--acc);
}
</style>
