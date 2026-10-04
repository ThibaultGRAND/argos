<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useUsageStore } from '../../stores/usage'
import { useContextText } from './context-text'
import ContextDetail from './ContextDetail.vue'

/** Jauge de contexte de la session ouverte, dans la barre d'état ; le clic ouvre le détail (F08). */
const { t, locale } = useI18n()
const usage = useUsageStore()
const { gauge } = storeToRefs(usage)
const text = useContextText()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const title = computed(() => {
  const current = gauge.value
  if (current === undefined) return ''
  const used = current.tokens.toLocaleString(locale.value)
  return current.window === null
    ? t('usage.contextTitleUnknown', { used })
    : t('usage.contextTitle', { used, window: current.window.toLocaleString(locale.value) })
})

function toggle(): void {
  open.value = !open.value
  if (open.value) void usage.loadBreakdown()
}

function onDocumentClick(event: MouseEvent): void {
  if (open.value && root.value !== null && !root.value.contains(event.target as Node)) open.value = false
}
function onKeydown(event: KeyboardEvent): void {
  if (open.value && event.key === 'Escape') open.value = false
}
document.addEventListener('mousedown', onDocumentClick)
document.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <span v-if="gauge" ref="root" class="gauge-anchor">
    <button
      type="button"
      class="gauge"
      :class="`gauge--${gauge.level}`"
      :title="title"
      :aria-label="t('usage.openDetail')"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="gauge__label">{{ t('usage.context') }}</span>
      <span v-if="gauge.percent !== null" class="gauge__bar" aria-hidden="true">
        <span class="gauge__fill" :style="{ width: `${Math.max(gauge.percent, 2)}%` }" />
      </span>
      <span>{{ text }}</span>
    </button>
    <ContextDetail v-if="open" @close="open = false" />
  </span>
</template>

<style scoped>
.gauge-anchor {
  position: relative;
}

.gauge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border: 0;
  border-radius: var(--radius);
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.gauge:hover {
  background: var(--raised);
  color: var(--tx2);
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

.gauge--caution {
  color: var(--caution);
}

.gauge--caution .gauge__fill {
  background: var(--caution);
}

.gauge--warning {
  color: var(--acc);
}

.gauge--warning .gauge__fill {
  background: var(--acc);
}
</style>
