<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { ContextCategoryDto } from '@shared/contract'
import { useSessionStore } from '../../stores/session'
import { useUsageStore } from '../../stores/usage'
import { formatModel, formatTokens, relativeToProject } from '../../utils/format'
import { useContextText } from './context-text'

/** Détail du contexte de la session ouverte : seuil de compactage, découpage par catégorie, totaux (F08). */
const emit = defineEmits<{ close: [] }>()
const { t, locale } = useI18n()
const { gauge, breakdown, breakdownLoading, breakdownAvailable } = storeToRefs(useUsageStore())
const { detail } = storeToRefs(useSessionStore())
const text = useContextText()

const model = computed(() => {
  const name = breakdown.value?.model || detail.value?.model
  return name ? formatModel(name) : '—'
})

const autoCompact = computed(() => {
  const current = gauge.value
  const at = breakdown.value?.autoCompactAt ?? current?.autoCompactAt ?? null
  const window = breakdown.value?.window ?? current?.window ?? null
  if (window === null) return undefined
  if (at === null) return t('usage.autoCompactOff')
  return t('usage.autoCompact', {
    tokens: formatTokens(at, locale.value),
    percent: Math.round((at / window) * 100),
  })
})

/** Teintes de la barre empilée : nuances neutres de la maquette, réserve hachurée, espace libre vide. */
const shades = ['var(--tx)', 'var(--tx2)', 'var(--tx3)', 'var(--rule2)', 'var(--caution)', 'var(--acc)']
const segments = computed(() => {
  const current = breakdown.value
  if (current == null) return []
  let shade = 0
  return current.categories.map((category) => ({
    ...category,
    share: (category.tokens / current.window) * 100,
    color:
      category.id === 'free'
        ? 'transparent'
        : category.id === 'buffer'
          ? 'var(--rule2)'
          : (shades[shade++ % shades.length] ?? 'var(--tx3)'),
  }))
})

const categoryName = (category: ContextCategoryDto): string =>
  t(`usage.categories.${category.id}`, { label: category.label })

const totals = computed(() => {
  const usage = detail.value?.usage
  if (usage === undefined) return []
  return [
    [
      t('panel.sheetFields.inputTokens'),
      t('usage.withCache', {
        total: formatTokens(usage.inputTokens + usage.cacheReadTokens + usage.cacheCreationTokens, locale.value),
        cache: formatTokens(usage.cacheReadTokens, locale.value),
      }),
    ],
    [t('panel.sheetFields.outputTokens'), formatTokens(usage.outputTokens, locale.value)],
  ] as const
})
</script>

<template>
  <div class="detail" role="dialog" :aria-label="t('usage.detailTitle', { model })">
    <header class="detail__head">
      <span class="detail__title">{{ t('usage.detailTitle', { model }) }}</span>
      <button type="button" class="detail__close" :aria-label="t('usage.close')" @click="emit('close')">×</button>
    </header>

    <p class="detail__total" :class="gauge ? `detail__total--${gauge.level}` : ''">{{ text }}</p>
    <p v-if="autoCompact" class="detail__note">{{ autoCompact }}</p>

    <section class="detail__section">
      <p v-if="!breakdownAvailable" class="detail__note">{{ t('usage.breakdownUnavailable') }}</p>
      <p v-else-if="breakdownLoading" class="detail__note">{{ t('usage.breakdownLoading') }}</p>
      <p v-else-if="breakdown === null" class="detail__note">{{ t('usage.breakdownFailed') }}</p>
      <template v-else-if="breakdown">
        <div class="detail__bar" aria-hidden="true">
          <span
            v-for="segment in segments"
            :key="`${segment.id}-${segment.label}`"
            class="detail__segment"
            :class="{ 'detail__segment--buffer': segment.id === 'buffer' }"
            :style="{ width: `${segment.share}%`, background: segment.color }"
          />
        </div>
        <ul class="detail__list">
          <li v-for="segment in segments" :key="`${segment.id}-${segment.label}`" class="detail__row">
            <span
              class="detail__swatch"
              :class="{
                'detail__swatch--free': segment.id === 'free',
                'detail__segment--buffer': segment.id === 'buffer',
              }"
              :style="{ background: segment.color }"
            />
            <span class="detail__name">{{ categoryName(segment) }}</span>
            <span class="detail__value">{{ formatTokens(segment.tokens, locale) }}</span>
          </li>
        </ul>
        <template v-if="breakdown.memoryFiles.length > 0">
          <p class="detail__subtitle">{{ t('usage.memoryFiles') }}</p>
          <ul class="detail__list">
            <li v-for="file in breakdown.memoryFiles" :key="file.path" class="detail__row">
              <span class="detail__name detail__path">
                {{ detail ? relativeToProject(file.path, detail.projectPath) : file.path }}
              </span>
              <span class="detail__value">{{ formatTokens(file.tokens, locale) }}</span>
            </li>
          </ul>
        </template>
      </template>
    </section>

    <section v-if="totals.length > 0" class="detail__section">
      <p class="detail__subtitle">{{ t('usage.sessionTotals') }}</p>
      <ul class="detail__list">
        <li v-for="[name, value] in totals" :key="name" class="detail__row">
          <span class="detail__name">{{ name }}</span>
          <span class="detail__value">{{ value }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.detail {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  width: 320px;
  padding: 14px 16px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: var(--bg);
  box-shadow: 0 8px 24px rgb(0 0 0 / 25%);
  font-family: var(--font-text);
  font-size: 13px;
  color: var(--tx);
  cursor: default;
}

.detail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail__title {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tx3);
}

.detail__close {
  border: 0;
  background: none;
  font-size: 16px;
  line-height: 1;
  color: var(--tx3);
  cursor: pointer;
}

.detail__close:hover {
  color: var(--tx);
}

.detail__total {
  margin: 8px 0 2px;
  font-family: var(--font-mono);
  font-size: 18px;
}

.detail__total--caution {
  color: var(--caution);
}

.detail__total--warning {
  color: var(--acc);
}

.detail__note {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--tx2);
}

.detail__section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--rule);
}

.detail__subtitle {
  margin: 10px 0 4px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tx3);
}

.detail__section > .detail__subtitle:first-child {
  margin-top: 0;
}

.detail__bar {
  display: flex;
  height: 8px;
  overflow: hidden;
  border: 1px solid var(--rule2);
  border-radius: 1px;
}

.detail__segment {
  flex: none;
  height: 100%;
}

.detail__segment--buffer {
  background-image: repeating-linear-gradient(135deg, transparent 0 2px, var(--bg) 2px 4px) !important;
}

.detail__list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.detail__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}

.detail__swatch {
  flex: none;
  width: 8px;
  height: 8px;
}

.detail__swatch--free {
  border: 1px solid var(--rule2);
}

.detail__name {
  flex: 1;
  min-width: 0;
  color: var(--tx2);
}

.detail__path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 12px;
}

.detail__value {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx);
}
</style>
