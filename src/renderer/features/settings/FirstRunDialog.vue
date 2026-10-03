<script setup lang="ts">
import type { PreferencesDto } from '@shared/contract'
import { useNoticesStore } from '../../stores/notices'
import { usePreferencesStore } from '../../stores/preferences'
import ArgosMark from '../../ui/ArgosMark.vue'

/** Premier lancement : choix de la langue, demandé une seule fois (F16). Textes volontairement dans les deux langues. */
const preferences = usePreferencesStore()
const notices = useNoticesStore()

function choose(language: PreferencesDto['language']): void {
  void notices.attempt(() => preferences.update({ language, firstRunCompleted: true }))
}
</script>

<template>
  <div class="overlay">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="first-run-title">
      <ArgosMark class="dialog__mark" />
      <h1 id="first-run-title" class="dialog__title">Choisissez votre langue</h1>
      <p class="dialog__subtitle">Choose your language</p>
      <div class="dialog__choices">
        <button type="button" class="dialog__choice" @click="choose('fr')">Français</button>
        <button type="button" class="dialog__choice" @click="choose('en')">English</button>
      </div>
      <p class="dialog__hint">Modifiable ensuite dans les paramètres · You can change it later in the settings.</p>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 420px;
  padding: 40px 32px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  text-align: center;
}

.dialog__mark {
  width: 40px;
  height: 40px;
}

.dialog__title {
  margin: 20px 0 4px;
  font-size: 22px;
  font-weight: 600;
}

.dialog__subtitle {
  margin: 0;
  color: var(--tx2);
}

.dialog__choices {
  display: flex;
  gap: 10px;
  margin-top: 28px;
}

.dialog__choice {
  min-width: 130px;
  padding: 10px 16px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: none;
  font-size: 15px;
  cursor: pointer;
}

.dialog__choice:hover,
.dialog__choice:focus-visible {
  border-color: var(--acc);
  background: var(--sel-bg);
}

.dialog__hint {
  margin: 24px 0 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}
</style>
