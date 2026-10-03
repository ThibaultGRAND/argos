<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PermissionRequestDto } from '@shared/contract'

/** Demande de permission de l'agent : l'agent attend la réponse (F05). */
const props = defineProps<{ request: PermissionRequestDto; projectPath: string }>()
defineEmits<{ answer: [decision: 'allow' | 'allow-session' | 'deny'] }>()
const { t } = useI18n()

const sentence = computed(() => props.request.title ?? t('live.permission.fallback', { tool: props.request.toolName }))
</script>

<template>
  <section class="permission" role="alert">
    <p class="permission__label">{{ t('live.permission.label') }}</p>
    <p class="permission__sentence">{{ sentence }}</p>
    <p v-if="request.target" class="permission__target">{{ request.target }}</p>
    <div class="permission__actions">
      <button type="button" class="permission__button permission__button--primary" @click="$emit('answer', 'allow')">
        {{ t('live.permission.allow') }}
      </button>
      <button type="button" class="permission__button" @click="$emit('answer', 'allow-session')">
        {{ t('live.permission.allowSession') }}
      </button>
      <button type="button" class="permission__button" @click="$emit('answer', 'deny')">
        {{ t('live.permission.deny') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.permission {
  margin: var(--gap-entry) 0;
  padding: 14px 16px;
  border: 1px solid var(--acc);
  border-left-width: 3px;
  border-radius: var(--radius);
  background: var(--raised);
}

.permission__label {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--acc);
}

.permission__sentence {
  margin: 0;
  font-weight: 500;
}

.permission__target {
  margin: 6px 0 0;
  padding: 6px 10px;
  border-radius: var(--radius);
  background: var(--term);
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-wrap: anywhere;
  user-select: text;
}

.permission__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.permission__button {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: none;
  font-size: 13px;
  cursor: pointer;
}

.permission__button:hover {
  background: var(--sel-bg);
}

.permission__button--primary {
  border-color: var(--acc);
  background: var(--acc);
  color: var(--bg);
}

.permission__button--primary:hover {
  background: var(--acc);
  opacity: 0.9;
}
</style>
