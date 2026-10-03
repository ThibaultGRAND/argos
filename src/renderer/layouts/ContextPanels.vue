<script setup lang="ts">
import UiMarker from '../ui/UiMarker.vue'

/** Colonne de droite 2a : D. Fichiers, E. Snapshots, F. Fiche. Contenu réel avec F02 et F06. */
const panels = ['files', 'snapshots', 'sheet'] as const
</script>

<template>
  <aside class="panels">
    <section v-for="panel in panels" :key="panel" class="panels__section">
      <UiMarker :label="$t(`panel.${panel}`)" />
      <p class="panels__empty">{{ $t('panel.empty') }}</p>
    </section>
  </aside>
</template>

<style scoped>
.panels {
  grid-area: panels;
  min-height: 0;
  overflow-y: auto;
  border-left: 1px solid var(--rule);
}

.panels__section {
  padding: 16px;
  border-bottom: 1px solid var(--rule);
}

.panels__empty {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--tx3);
}
</style>
