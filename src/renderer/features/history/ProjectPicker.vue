<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { ProjectSummaryDto } from '@shared/contract'
import { shortenPath } from '../../utils/format'

/** Sélecteur de projet de la barre latérale : nom, chemin, nombre de sessions. */
const props = defineProps<{ projects: readonly ProjectSummaryDto[]; selected: ProjectSummaryDto | undefined }>()
const emit = defineEmits<{ select: [projectId: number] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function choose(projectId: number): void {
  open.value = false
  emit('select', projectId)
}

function onDocumentClick(event: MouseEvent): void {
  if (root.value !== null && !root.value.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="picker">
    <button
      type="button"
      class="picker__current"
      :aria-expanded="open"
      :disabled="props.projects.length === 0"
      @click="open = !open"
    >
      <span class="picker__text">
        <span class="picker__name">{{ props.selected?.name ?? $t('nav.noProject') }}</span>
        <span v-if="props.selected" class="picker__path">{{ shortenPath(props.selected.path) }}</span>
      </span>
      <span class="picker__caret" aria-hidden="true">▾</span>
    </button>

    <ul v-if="open" class="picker__list" role="listbox" :aria-label="$t('nav.chooseProject')">
      <li v-for="project in props.projects" :key="project.id">
        <button
          type="button"
          role="option"
          class="picker__option"
          :class="{ 'picker__option--selected': project.id === props.selected?.id }"
          :aria-selected="project.id === props.selected?.id"
          @click="choose(project.id)"
        >
          <span class="picker__text">
            <span class="picker__name">{{ project.name }}</span>
            <span class="picker__path">{{ shortenPath(project.path) }}</span>
          </span>
          <span class="picker__count">{{ project.sessionCount }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.picker {
  position: relative;
  border-bottom: 1px solid var(--rule);
}

.picker__current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.picker__current:disabled {
  cursor: default;
}

.picker__current:hover:not(:disabled) {
  background: var(--sel-bg);
}

.picker__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.picker__name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker__path,
.picker__count,
.picker__caret {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}

.picker__path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker__list {
  position: absolute;
  top: 100%;
  right: 8px;
  left: 8px;
  z-index: 10;
  max-height: 420px;
  margin: 4px 0 0;
  padding: 4px 0;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: var(--raised);
}

.picker__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.picker__option:hover,
.picker__option--selected {
  background: var(--sel-bg);
}
</style>
