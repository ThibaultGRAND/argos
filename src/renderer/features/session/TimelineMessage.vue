<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MessageEntryDto } from '@shared/contract'
import { formatTime } from '../../utils/format'
import MarkdownText from './MarkdownText.vue'

/** Entrée numérotée et datée : un message de l'utilisateur ou de l'agent. */
const props = defineProps<{ number: number; entry: MessageEntryDto }>()
const { t, locale } = useI18n()

const label = computed(
  () =>
    `${String(props.number).padStart(2, '0')} · ${formatTime(props.entry.occurredAt, locale.value)} · ${t(`document.roles.${props.entry.role}`)}`,
)
</script>

<template>
  <article class="message" :class="`message--${entry.role}`" :data-seq="entry.seq">
    <p class="message__label">{{ label }}</p>
    <MarkdownText v-if="entry.role === 'assistant'" :text="entry.text" />
    <div v-else class="message__text">{{ entry.text }}</div>
    <p v-if="entry.truncated" class="message__truncated">
      {{ t('document.truncated', { count: entry.text.length.toLocaleString(locale) }) }}
    </p>
  </article>
</template>

<style scoped>
.message {
  padding: var(--gap-entry) 0;
}

.message--user {
  padding: var(--gap-entry) 16px;
  margin: var(--gap-entry) -16px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--user-bg);
}

.message--target {
  animation: target 2.4s ease-out;
}

@keyframes target {
  0%,
  40% {
    box-shadow: inset 2px 0 0 var(--acc);
    background-color: var(--sel-bg);
  }
}

.message__label {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx3);
}

.message__text {
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: text;
}

.message__truncated {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--acc);
}
</style>
