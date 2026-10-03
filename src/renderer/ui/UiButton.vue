<script setup lang="ts">
/** Bouton fin à contour (direction C1). `shortcut` affiche le raccourci clavier en monospace. */
withDefaults(defineProps<{ variant?: 'outline' | 'ghost'; shortcut?: string; disabled?: boolean }>(), {
  variant: 'outline',
  shortcut: undefined,
  disabled: false,
})
</script>

<template>
  <button class="button" :class="`button--${variant}`" type="button" :disabled="disabled">
    <span><slot /></span>
    <kbd v-if="shortcut" class="button__shortcut">{{ shortcut }}</kbd>
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: transparent;
  color: var(--tx);
  font-size: 13px;
  cursor: pointer;
}

.button--ghost {
  border-color: transparent;
  color: var(--tx2);
}

.button:hover:not(:disabled) {
  background: var(--sel-bg);
}

.button:disabled {
  cursor: default;
  opacity: 0.45;
}

.button__shortcut {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}
</style>
