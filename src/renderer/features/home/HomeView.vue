<script setup lang="ts">
import UiEmptyState from '../../ui/UiEmptyState.vue'
</script>

<template>
  <div class="home">
    <UiEmptyState :title="$t('document.empty.title')" :body="$t('document.empty.body')" />
  </div>
</template>

<style scoped>
.home {
  max-width: var(--size-document);
  margin: 0 auto;
}
</style>
