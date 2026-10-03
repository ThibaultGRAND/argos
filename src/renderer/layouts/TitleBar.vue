<script setup lang="ts">
import ArgosMark from '../ui/ArgosMark.vue'

/** Barre de titre déplaçable ; sous macOS, laisse la place aux boutons de fenêtre natifs. */
defineProps<{ macos: boolean }>()
</script>

<template>
  <header class="titlebar" :class="{ 'titlebar--macos': macos }">
    <ArgosMark />
    <span class="titlebar__name">{{ $t('app.name') }}</span>
  </header>
</template>

<style scoped>
.titlebar {
  grid-area: titlebar;
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--size-titlebar);
  padding: 0 16px;
  border-bottom: 1px solid var(--rule);
  -webkit-app-region: drag;
}

.titlebar--macos {
  padding-left: 84px;
}

.titlebar__name {
  font-weight: 600;
  letter-spacing: 0.01em;
}
</style>
