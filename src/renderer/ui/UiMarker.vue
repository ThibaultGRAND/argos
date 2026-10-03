<script setup lang="ts">
/** Repère monospace façon document imprimé (« D. FICHIERS », « SESSIONS · 24 »). */
defineProps<{ label: string }>()
</script>

<template>
  <span class="marker">{{ label }}</span>
</template>

<style scoped>
.marker {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tx3);
}
</style>
