<script setup lang="ts">
import ArgosMark from '../ui/ArgosMark.vue'

/** Barre de titre déplaçable ; sous macOS, laisse la place aux boutons de fenêtre natifs. */
defineProps<{ macos: boolean }>()
</script>

<template>
  <header class="titlebar" :class="{ 'titlebar--macos': macos }">
    <ArgosMark />
    <span class="titlebar__name">{{ $t('app.name') }}</span>
    <span class="titlebar__spacer" />
    <RouterLink
      class="titlebar__settings"
      :to="{ name: 'settings' }"
      :title="`${$t('settings.open')} (${macos ? '⌘,' : 'Ctrl+,'})`"
      :aria-label="$t('settings.open')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z M19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7 7 0 0 1-1.7 1l-.3 2h-3.6l-.3-2a7 7 0 0 1-1.7-1l-1.9.7-1.8-3.1 1.6-1.2a7 7 0 0 1 0-3L2.9 9.3l1.8-3.1 1.9.7a7 7 0 0 1 1.7-1l.3-2h3.6l.3 2a7 7 0 0 1 1.7 1l1.9-.7 1.8 3.1-1.6 1.2a7 7 0 0 1 0 3Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
      </svg>
    </RouterLink>
  </header>
</template>

<style scoped>
.titlebar {
  grid-area: titlebar;
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--size-titlebar);
  padding: 0 16px;
  border-bottom: 1px solid var(--rule);
  -webkit-app-region: drag;
}

.titlebar--macos {
  padding-left: 84px;
}

.titlebar__name {
  font-weight: 600;
  letter-spacing: 0.01em;
}

.titlebar__spacer {
  flex: 1;
}

.titlebar__settings {
  display: inline-flex;
  padding: 4px;
  border-radius: var(--radius);
  color: var(--tx3);
  -webkit-app-region: no-drag;
}

.titlebar__settings:hover,
.titlebar__settings.router-link-active {
  color: var(--tx);
  background: var(--sel-bg);
}

.titlebar__settings svg {
  width: 18px;
  height: 18px;
}
</style>
