<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Demande de confirmation avant une action importante. Échap annule, Entrée confirme. */
defineProps<{ title: string; body: string; confirmLabel: string; cancelLabel: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const confirmButton = ref<HTMLButtonElement | null>(null)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('cancel')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true)
  confirmButton.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <div class="overlay" @mousedown.self="emit('cancel')">
    <div class="confirm" role="alertdialog" aria-modal="true" :aria-label="title">
      <p class="confirm__title">{{ title }}</p>
      <p class="confirm__body">{{ body }}</p>
      <div class="confirm__actions">
        <button type="button" class="confirm__button" @click="emit('cancel')">{{ cancelLabel }}</button>
        <button
          ref="confirmButton"
          type="button"
          class="confirm__button confirm__button--primary"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 35%);
}

.confirm {
  width: min(460px, calc(100vw - 48px));
  padding: 22px 24px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: var(--bg);
}

.confirm__title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
}

.confirm__body {
  margin: 0;
  color: var(--tx2);
  line-height: 1.55;
}

.confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.confirm__button {
  height: 30px;
  padding: 0 14px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: none;
  cursor: pointer;
}

.confirm__button--primary {
  border-color: var(--acc);
  background: var(--acc);
  color: var(--bg);
}
</style>
