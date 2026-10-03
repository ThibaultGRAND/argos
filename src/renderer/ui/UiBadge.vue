<script setup lang="ts">
/** Badge de statut : filet fin, monospace. L'accent est réservé à ce qui demande l'attention. */
withDefaults(defineProps<{ tone?: 'neutral' | 'accent' }>(), { tone: 'neutral' })
</script>

<template>
  <span class="badge" :class="`badge--${tone}`"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx2);
  white-space: nowrap;
}

.badge--accent {
  border-color: var(--acc);
  color: var(--acc);
}
</style>
