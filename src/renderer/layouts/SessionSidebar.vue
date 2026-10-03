<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ProjectPicker from '../features/history/ProjectPicker.vue'
import SessionListItem from '../features/history/SessionListItem.vue'
import { useHistoryStore } from '../stores/history'
import UiButton from '../ui/UiButton.vue'
import UiEmptyState from '../ui/UiEmptyState.vue'
import UiMarker from '../ui/UiMarker.vue'

/** Barre latérale 2a : projet, recherche, sessions filtrables par statut et par titre. */
const history = useHistoryStore()
const router = useRouter()
const { projects, selectedProject, sessions, selectedSessionId, error } = storeToRefs(history)

const filters = ['all', 'running', 'waiting', 'done'] as const
type Filter = (typeof filters)[number]
const activeFilter = ref<Filter>('all')

// Argos ne pilote pas encore de session (V1) : toutes les sessions importées sont terminées.
const total = computed(() => selectedProject.value?.sessionCount ?? 0)
const counts = computed<Record<Filter, number>>(() => ({ all: total.value, running: 0, waiting: 0, done: total.value }))
const visibleSessions = computed(() =>
  activeFilter.value === 'running' || activeFilter.value === 'waiting' ? [] : sessions.value,
)

const filterText = ref('')
let debounce: ReturnType<typeof setTimeout> | undefined
watch(filterText, (value) => {
  if (debounce !== undefined) clearTimeout(debounce)
  debounce = setTimeout(() => void history.setQuery(value), 200)
})
watch(selectedProject, () => {
  filterText.value = ''
  activeFilter.value = 'all'
})

/** Choisir un autre projet dans le sélecteur ferme la session ouverte. */
async function chooseProject(projectId: number): Promise<void> {
  if (projectId === selectedProject.value?.id) return
  await history.selectProject(projectId)
  await router.push({ name: 'home' })
}
</script>

<template>
  <aside class="sidebar">
    <ProjectPicker :projects="projects" :selected="selectedProject" @select="chooseProject" />

    <div class="sidebar__block">
      <UiButton class="sidebar__search" shortcut="⌘K" disabled>{{ $t('nav.search') }}</UiButton>
    </div>

    <div class="sidebar__block sidebar__heading">
      <UiMarker :label="`${$t('nav.sessions')} · ${total}`" />
      <UiButton variant="ghost" shortcut="⌘N" disabled>+ {{ $t('nav.newSession') }}</UiButton>
    </div>

    <nav class="sidebar__filters">
      <button
        v-for="filter in filters"
        :key="filter"
        type="button"
        class="sidebar__filter"
        :class="{ 'sidebar__filter--active': filter === activeFilter }"
        @click="activeFilter = filter"
      >
        {{ $t(`sessions.filters.${filter}`) }} <span class="mono">{{ counts[filter] }}</span>
      </button>
    </nav>

    <div class="sidebar__block">
      <input
        v-model="filterText"
        class="sidebar__input"
        type="search"
        :placeholder="$t('sessions.filterPlaceholder')"
        :disabled="selectedProject === undefined"
      />
    </div>

    <p v-if="error" class="sidebar__error">{{ $t('sessions.loadError') }}</p>

    <div class="sidebar__list">
      <SessionListItem
        v-for="session in visibleSessions"
        :key="session.id"
        :session="session"
        :selected="session.id === selectedSessionId"
        @select="router.push({ name: 'session', params: { id: session.id } })"
      />

      <UiEmptyState
        v-if="projects.length === 0"
        size="small"
        :title="$t('projects.empty.title')"
        :body="$t('projects.empty.body')"
      />
      <UiEmptyState
        v-else-if="activeFilter === 'running' || activeFilter === 'waiting'"
        size="small"
        :title="$t('sessions.empty.title')"
        :body="$t('sessions.notRunInArgos')"
      />
      <UiEmptyState v-else-if="visibleSessions.length === 0" size="small" :title="$t('sessions.noMatch')" />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--side);
  border-right: 1px solid var(--rule);
}

.sidebar__block {
  padding: 12px 16px 0;
}

.sidebar__search {
  width: 100%;
}

.sidebar__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 18px;
}

.sidebar__filters {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 10px 16px 0;
  border-bottom: 1px solid var(--rule);
}

.sidebar__filter {
  flex: none;
  padding: 6px 0;
  white-space: nowrap;
  border: 0;
  border-bottom: 1px solid transparent;
  margin-bottom: -1px;
  background: none;
  color: var(--tx3);
  font-size: 12px;
  cursor: pointer;
}

.sidebar__filter--active {
  border-bottom-color: var(--tx);
  color: var(--tx);
}

.sidebar__input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--input);
  font-size: 13px;
}

.sidebar__input::placeholder {
  color: var(--tx3);
}

.sidebar__error {
  margin: 12px 16px 0;
  font-size: 13px;
  color: var(--acc);
}

.sidebar__list {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  overflow-y: auto;
  border-top: 1px solid var(--rule);
}
</style>
