<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SessionSummaryDto } from '@shared/contract'
import { formatModel, formatWhen } from '../../utils/format'

/** Une session dans la liste : date, titre, extrait, fournisseur et modèle, fichiers modifiés. */
const props = defineProps<{ session: SessionSummaryDto; selected: boolean }>()
defineEmits<{ select: [] }>()

const { t, locale } = useI18n()

const when = computed(() => formatWhen(props.session.lastActivityAt, locale.value))
const providerAndModel = computed(() => {
  const provider = t(`providers.${props.session.providerId}`)
  return props.session.model === null ? provider : `${provider} · ${formatModel(props.session.model)}`
})
</script>

<template>
  <button type="button" class="item" :class="{ 'item--selected': selected }" @click="$emit('select')">
    <span class="item__when">{{ when }}</span>
    <span class="item__title" :class="{ 'item__title--untitled': session.title === null }">
      {{ session.title ?? t('sessions.untitled') }}
    </span>
    <span v-if="session.excerpt" class="item__excerpt">{{ session.excerpt }}</span>
    <span class="item__meta">
      <span>{{ providerAndModel }}</span>
      <span v-if="session.filesChanged > 0" class="item__changes">
        {{ t('sessions.files', { count: session.filesChanged }) }}
        <span class="item__added">+{{ session.linesAdded }}</span>
        <span>−{{ session.linesRemoved }}</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 12px 16px 12px 14px;
  border: 0;
  border-bottom: 1px solid var(--rule);
  border-left: 2px solid transparent;
  background: none;
  text-align: left;
  cursor: pointer;
}

.item:hover {
  background: var(--sel-bg);
}

.item--selected {
  border-left-color: var(--acc);
  background: var(--sel-bg);
}

.item__when,
.item__meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}

.item__title {
  font-weight: 500;
  line-height: 1.35;
}

.item__title--untitled {
  color: var(--tx2);
  font-style: italic;
}

.item__excerpt {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 13px;
  color: var(--tx2);
}

.item__meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
}

.item__changes {
  display: inline-flex;
  gap: 6px;
  white-space: nowrap;
}

.item__added {
  color: var(--tx2);
}
</style>
