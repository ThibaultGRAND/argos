<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ToolEntryDto } from '@shared/contract'
import { formatTime, relativeToProject } from '../../utils/format'

/** Appels d'outils consécutifs, repliés sur une ligne et dépliables. */
const props = defineProps<{
  number: number
  entries: readonly ToolEntryDto[]
  counts: readonly (readonly [string, number])[]
  errors: number
  projectPath: string
}>()
const { t, te, locale } = useI18n()
const open = ref(false)

const knownKinds = ['read', 'edit', 'write', 'command', 'search', 'web', 'subagent', 'other']

const label = computed(() => {
  const first = props.entries[0]
  const time = first === undefined ? '' : formatTime(first.occurredAt, locale.value)
  return `${String(props.number).padStart(2, '0')} · ${time} · ${t(`document.roles.assistant`)}`
})

const summary = computed(() => {
  const kinds = props.counts
    .map(([kind, count]) => t(`document.toolKinds.${knownKinds.includes(kind) ? kind : 'other'}`, { count }, count))
    .join(', ')
  return `${t('document.toolCalls', { count: props.entries.length }, props.entries.length)} · ${kinds}`
})

function verb(tool: ToolEntryDto): string {
  if (tool.toolKind === 'command') return '$'
  const key = `document.toolVerbs.${tool.toolKind}`
  return te(key) ? t(key) : tool.toolName
}

function target(tool: ToolEntryDto): string {
  if (tool.target === null) return tool.summary ?? tool.toolName
  return tool.toolKind === 'command' || tool.toolKind === 'web' || tool.toolKind === 'search'
    ? tool.target
    : relativeToProject(tool.target, props.projectPath)
}
</script>

<template>
  <section class="tools">
    <p class="tools__label">{{ label }}</p>
    <button type="button" class="tools__toggle" :aria-expanded="open" @click="open = !open">
      <span class="tools__caret" aria-hidden="true">{{ open ? '▾' : '▸' }}</span>
      <span class="tools__summary">{{ summary }}</span>
      <span v-if="errors > 0" class="tools__errors">{{ t('document.toolErrors', { count: errors }, errors) }}</span>
    </button>
    <ul v-if="open" class="tools__list">
      <li
        v-for="tool in entries"
        :key="tool.seq"
        class="tools__item"
        :class="{ 'tools__item--error': tool.status === 'error' }"
      >
        <span class="tools__verb">{{ verb(tool) }}</span>
        <span class="tools__target" :title="tool.target ?? undefined">{{ target(tool) }}</span>
        <span v-if="tool.linesAdded > 0 || tool.linesRemoved > 0" class="tools__changes">
          +{{ tool.linesAdded }} −{{ tool.linesRemoved }}
        </span>
        <span v-if="tool.status === 'error'" class="tools__status">{{ t('document.toolError') }}</span>
        <span v-else-if="tool.status === 'pending'" class="tools__status">{{ t('document.toolPending') }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.tools {
  padding: var(--gap-entry) 0;
}

.tools__label {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx3);
}

.tools__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--raised);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx2);
  text-align: left;
  cursor: pointer;
}

.tools__toggle:hover {
  border-color: var(--rule2);
}

.tools__caret {
  color: var(--tx3);
}

.tools__summary {
  flex: 1;
}

.tools__errors {
  color: var(--acc);
}

.tools__list {
  margin: 0;
  padding: 6px 0 0;
  list-style: none;
  border-left: 1px solid var(--rule);
  margin-left: 14px;
}

.tools__item {
  display: flex;
  gap: 10px;
  padding: 3px 0 3px 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx2);
}

.tools__verb {
  flex: none;
  min-width: 70px;
  color: var(--tx3);
}

.tools__target {
  flex: 1;
  overflow: hidden;
  color: var(--tx);
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: text;
}

.tools__changes {
  flex: none;
  color: var(--tx3);
}

.tools__status,
.tools__item--error .tools__verb {
  flex: none;
  color: var(--acc);
}
</style>
