<script setup lang="ts">
import type { LiveStatusDto } from '@shared/contract'
import UiBadge from '../../ui/UiBadge.vue'

/** Statut d'une session pilotée : l'accent est réservé à « attend une action ». */
defineProps<{ status: LiveStatusDto }>()
</script>

<template>
  <UiBadge :tone="status === 'waiting' || status === 'error' ? 'accent' : 'neutral'">
    <span v-if="status === 'running' || status === 'starting'" class="pulse" aria-hidden="true" />
    {{ $t(`live.status.${status}`) }}
  </UiBadge>
</template>

<style scoped>
.pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.25;
  }
}
</style>
