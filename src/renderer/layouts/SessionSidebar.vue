<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiEmptyState from '../ui/UiEmptyState.vue'
import UiMarker from '../ui/UiMarker.vue'

/** Barre latérale 2a : projet, recherche, sessions filtrables. Contenu réel avec F01 et F02. */
const filters = ['all', 'running', 'waiting', 'done'] as const
const activeFilter = ref<(typeof filters)[number]>('all')
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__project">
      <span class="sidebar__project-name">{{ $t('nav.noProject') }}</span>
    </div>

    <div class="sidebar__block">
      <UiButton class="sidebar__search" shortcut="⌘K" disabled>{{ $t('nav.search') }}</UiButton>
    </div>

    <div class="sidebar__block sidebar__heading">
      <UiMarker :label="`${$t('nav.sessions')} · 0`" />
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
        {{ $t(`sessions.filters.${filter}`) }} <span class="mono">0</span>
      </button>
    </nav>

    <div class="sidebar__block">
      <input class="sidebar__input" type="search" :placeholder="$t('sessions.filterPlaceholder')" disabled />
    </div>

    <UiEmptyState size="small" :title="$t('sessions.empty.title')" :body="$t('sessions.empty.body')" />
  </aside>
</template>

<style scoped>
.sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  background: var(--side);
  border-right: 1px solid var(--rule);
}

.sidebar__project {
  padding: 14px 16px;
  border-bottom: 1px solid var(--rule);
}

.sidebar__project-name {
  font-weight: 600;
  color: var(--tx2);
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
  gap: 14px;
  padding: 10px 16px 0;
  border-bottom: 1px solid var(--rule);
}

.sidebar__filter {
  padding: 6px 0;
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
</style>
