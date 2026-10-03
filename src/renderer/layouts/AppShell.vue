<script setup lang="ts">
import ContextPanels from './ContextPanels.vue'
import SessionSidebar from './SessionSidebar.vue'
import StatusBar from './StatusBar.vue'
import TitleBar from './TitleBar.vue'

/** Structure 2a : barre de titre, barre latérale, document, colonne D/E/F, barre d'état. */
defineProps<{ macos: boolean }>()
</script>

<template>
  <div class="shell">
    <TitleBar :macos="macos" />
    <SessionSidebar />
    <main class="shell__document">
      <slot />
    </main>
    <ContextPanels />
    <StatusBar />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--size-nav) minmax(0, 1fr) var(--size-panel);
  grid-template-rows: var(--size-titlebar) minmax(0, 1fr) var(--size-statusbar);
  grid-template-areas:
    'titlebar titlebar titlebar'
    'sidebar document panels'
    'status status status';
  height: 100%;
}

.shell__document {
  grid-area: document;
  min-height: 0;
  overflow-y: auto;
}
</style>
