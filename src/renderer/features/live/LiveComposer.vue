<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ModelChoiceDto } from '@shared/contract'

/** Zone de saisie en bas du document (maquette 2a) : consigne, modèle, Envoyer ⌘⏎. */
const props = defineProps<{ busy?: boolean; macos: boolean }>()
const emit = defineEmits<{ submit: [text: string, model: ModelChoiceDto | undefined] }>()
const { t } = useI18n()

const text = ref('')
const model = ref<ModelChoiceDto | 'default'>('default')
const field = ref<HTMLTextAreaElement | null>(null)
const models: readonly (ModelChoiceDto | 'default')[] = ['default', 'opus', 'sonnet', 'haiku']

const canSend = computed(() => text.value.trim() !== '' && props.busy !== true)
const shortcut = computed(() => (props.macos ? '⌘⏎' : 'Ctrl+⏎'))

async function submit(): Promise<void> {
  if (!canSend.value) return
  emit('submit', text.value.trim(), model.value === 'default' ? undefined : model.value)
  text.value = ''
  await nextTick()
  resize()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && (props.macos ? event.metaKey : event.ctrlKey)) {
    event.preventDefault()
    void submit()
  }
}

/** La zone grandit avec le texte, jusqu'à une hauteur maximale. */
function resize(): void {
  const element = field.value
  if (element === null) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 240)}px`
}

defineExpose({ focus: () => field.value?.focus() })
</script>

<template>
  <div class="composer">
    <textarea
      ref="field"
      v-model="text"
      class="composer__field"
      rows="2"
      :placeholder="t('live.placeholder')"
      @input="resize"
      @keydown="onKeydown"
    />
    <div class="composer__bar">
      <label class="composer__model">
        <span class="composer__label">{{ t('live.model') }}</span>
        <select v-model="model" class="composer__select">
          <option v-for="choice in models" :key="choice" :value="choice">{{ t(`live.models.${choice}`) }}</option>
        </select>
      </label>
      <button type="button" class="composer__send" :disabled="!canSend" @click="submit">
        {{ t('live.send') }} <kbd>{{ shortcut }}</kbd>
      </button>
    </div>
  </div>
</template>

<style scoped>
.composer {
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: var(--input);
}

.composer__field {
  display: block;
  width: 100%;
  min-height: 56px;
  padding: 12px 14px 4px;
  border: 0;
  outline: none;
  resize: none;
  background: none;
  font-size: 14px;
  line-height: 1.5;
  user-select: text;
}

.composer__field::placeholder {
  color: var(--tx3);
}

.composer__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 8px 14px;
}

.composer__model {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.composer__label,
.composer__select,
.composer__send kbd {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}

.composer__select {
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--tx2);
}

.composer__send {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--tx2);
  border-radius: var(--radius);
  background: var(--tx);
  color: var(--bg);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.composer__send kbd {
  color: var(--bg);
  opacity: 0.7;
}

.composer__send:disabled {
  border-color: var(--rule2);
  background: none;
  color: var(--tx3);
  cursor: default;
}

.composer__send:disabled kbd {
  color: var(--tx3);
}
</style>
