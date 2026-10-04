<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useUsageStore } from '../../stores/usage'
import { useContextText } from './context-text'

/** Jauge de contexte de la session ouverte, dans la barre d'état (F08). */
const { t, locale } = useI18n()
const { gauge } = storeToRefs(useUsageStore())

const text = useContextText()

const title = computed(() => {
  const current = gauge.value
  if (current === undefined) return ''
  const used = current.tokens.toLocaleString(locale.value)
  return current.window === null
    ? t('usage.contextTitleUnknown', { used })
    : t('usage.contextTitle', { used, window: current.window.toLocaleString(locale.value) })
})
</script>

<template>
  <span v-if="gauge" class="gauge" :class="{ 'gauge--warning': gauge.warning }" :title="title">
    <span class="gauge__label">{{ t('usage.context') }}</span>
    <span v-if="gauge.percent !== null" class="gauge__bar" aria-hidden="true">
      <span class="gauge__fill" :style="{ width: `${Math.max(gauge.percent, 2)}%` }" />
    </span>
    <span>{{ text }}</span>
  </span>
</template>

<style scoped>
.gauge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.gauge__label {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.gauge__bar {
  position: relative;
  width: 48px;
  height: 4px;
  background: var(--rule);
}

.gauge__fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--tx2);
}

.gauge--warning {
  color: var(--acc);
}

.gauge--warning .gauge__fill {
  background: var(--acc);
}
</style>
