<script setup lang="ts">
/** Icône d'Argos : un hexagone isométrique avec un œil (CLAUDE.md §1). */
</script>

<template>
  <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5 20.5 7.25v9.5L12 21.5 3.5 16.75v-9.5Z" fill="none" stroke="currentColor" stroke-width="1.2" />
    <path
      d="M6.5 12c1.6-2.4 3.4-3.6 5.5-3.6s3.9 1.2 5.5 3.6c-1.6 2.4-3.4 3.6-5.5 3.6S8.1 14.4 6.5 12Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.2"
    />
    <circle cx="12" cy="12" r="1.6" fill="var(--acc)" />
  </svg>
</template>

<style scoped>
.mark {
  width: 18px;
  height: 18px;
  color: var(--tx);
}
</style>
