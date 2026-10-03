<script setup lang="ts">
/** État vide : un volume isométrique sobre, un titre et une phrase. */
defineProps<{ title: string; body?: string; size?: 'small' | 'large' }>()
</script>

<template>
  <div class="empty" :class="size === 'small' ? 'empty--small' : 'empty--large'">
    <svg class="empty__cube" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6 56 19v26L32 58 8 45V19Z" fill="none" stroke="currentColor" stroke-width="1" />
      <path d="M8 19l24 13 24-13M32 32v26" fill="none" stroke="currentColor" stroke-width="1" />
      <path d="M32 6 56 19 32 32 8 19Z" fill="currentColor" opacity="0.08" />
    </svg>
    <p class="empty__title">{{ title }}</p>
    <p v-if="body" class="empty__body">{{ body }}</p>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--tx3);
}

.empty--large {
  gap: 10px;
  padding: 96px 24px;
}

.empty--small {
  gap: 6px;
  padding: 32px 16px;
}

.empty__cube {
  width: 56px;
  height: 56px;
  color: var(--rule2);
}

.empty--small .empty__cube {
  width: 36px;
  height: 36px;
}

.empty__title {
  margin: 0;
  color: var(--tx2);
  font-weight: 500;
}

.empty__body {
  margin: 0;
  max-width: 340px;
  font-size: 13px;
}
</style>
