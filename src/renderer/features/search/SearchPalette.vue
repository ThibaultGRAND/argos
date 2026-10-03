<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { SearchPeriodDto } from '@shared/contract'
import { useHistoryStore } from '../../stores/history'
import { useSearchStore, type SearchItem } from '../../stores/search'
import UiMarker from '../../ui/UiMarker.vue'
import { formatWhen } from '../../utils/format'
import { splitSnippet } from '../../utils/highlight'

/** Palette ⌘K : recherche dans toutes les conversations (F03). */
const search = useSearchStore()
const history = useHistoryStore()
const router = useRouter()
const { t, locale } = useI18n()
const { query, scope, period, items, activeIndex, failed } = storeToRefs(search)

const input = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)
const periods: readonly SearchPeriodDto[] = ['all', 'week', 'month', 'year']

let debounce: ReturnType<typeof setTimeout> | undefined
function scheduleSearch(): void {
  if (debounce !== undefined) clearTimeout(debounce)
  debounce = setTimeout(() => void search.run(history.selectedProjectId), 150)
}
watch([query, scope, period], scheduleSearch)

watch(
  () => search.isOpen,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    input.value?.select()
  },
  { immediate: true },
)

watch(activeIndex, async () => {
  await nextTick()
  list.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
})

async function choose(item: SearchItem | undefined): Promise<void> {
  if (item === undefined) return
  search.close()
  if (item.kind === 'session') {
    await router.push({ name: 'session', params: { id: item.hit.sessionId } })
  } else {
    await router.push({ name: 'session', params: { id: item.hit.sessionId }, query: { seq: item.hit.seq } })
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    search.move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    search.move(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    void choose(items.value[activeIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    search.close()
  }
}

const indexOf = (item: SearchItem): number => items.value.indexOf(item)

type SessionItem = Extract<SearchItem, { kind: 'session' }>
type MessageItem = Extract<SearchItem, { kind: 'message' }>
const sessionItems = computed(() => items.value.filter((item): item is SessionItem => item.kind === 'session'))
const messageItems = computed(() => items.value.filter((item): item is MessageItem => item.kind === 'message'))
</script>

<template>
  <div class="overlay" @mousedown.self="search.close()">
    <div class="palette" role="dialog" aria-modal="true" @keydown="onKeydown">
      <div class="palette__field">
        <input
          ref="input"
          v-model="query"
          class="palette__input"
          type="search"
          :placeholder="t('search.placeholder')"
          :aria-label="t('search.placeholder')"
        />
        <kbd class="palette__esc">Esc</kbd>
      </div>

      <div class="palette__filters">
        <button
          v-for="value in ['all', 'project'] as const"
          :key="value"
          type="button"
          class="palette__chip"
          :class="{ 'palette__chip--active': scope === value }"
          :disabled="value === 'project' && history.selectedProject === undefined"
          @click="scope = value"
        >
          {{
            value === 'project' ? (history.selectedProject?.name ?? t('search.scope.project')) : t('search.scope.all')
          }}
        </button>
        <span class="palette__separator" />
        <button
          v-for="value in periods"
          :key="value"
          type="button"
          class="palette__chip"
          :class="{ 'palette__chip--active': period === value }"
          @click="period = value"
        >
          {{ t(`search.periods.${value}`) }}
        </button>
      </div>

      <div ref="list" class="palette__results">
        <p v-if="failed" class="palette__note palette__note--error">{{ t('search.error') }}</p>
        <p v-else-if="query.trim().length < 2" class="palette__note">{{ t('search.hint') }}</p>
        <p v-else-if="items.length === 0" class="palette__note">{{ t('search.noResult', { query: query.trim() }) }}</p>

        <template v-if="sessionItems.length > 0">
          <UiMarker class="palette__group" :label="`${t('search.groups.sessions')} · ${sessionItems.length}`" />
          <button
            v-for="item in sessionItems"
            :key="`s${item.hit.sessionId}`"
            type="button"
            class="palette__item"
            :data-active="indexOf(item) === activeIndex"
            @mousemove="activeIndex = indexOf(item)"
            @click="choose(item)"
          >
            <span class="palette__title">{{ item.hit.title ?? t('sessions.untitled') }}</span>
            <span class="palette__meta"
              >{{ item.hit.projectName }} · {{ formatWhen(item.hit.lastActivityAt, locale) }}</span
            >
          </button>
        </template>

        <template v-if="messageItems.length > 0">
          <UiMarker class="palette__group" :label="`${t('search.groups.messages')} · ${messageItems.length}`" />
          <button
            v-for="item in messageItems"
            :key="`m${item.hit.sessionId}-${item.hit.seq}`"
            type="button"
            class="palette__item"
            :data-active="indexOf(item) === activeIndex"
            @mousemove="activeIndex = indexOf(item)"
            @click="choose(item)"
          >
            <span class="palette__snippet">
              <template v-for="(part, index) in splitSnippet(item.hit.snippet)" :key="index">
                <mark v-if="part.highlighted">{{ part.text }}</mark>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
            <span class="palette__meta">
              {{ item.hit.sessionTitle ?? t('sessions.untitled') }} · {{ item.hit.projectName }} ·
              {{ t(`document.roles.${item.hit.role}`) }} · {{ formatWhen(item.hit.occurredAt, locale) }}
            </span>
          </button>
        </template>
      </div>

      <footer class="palette__footer">{{ t('search.keys') }}</footer>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  padding-top: 12vh;
  background: rgb(0 0 0 / 35%);
}

.palette {
  display: flex;
  flex-direction: column;
  width: min(760px, calc(100vw - 48px));
  max-height: 70vh;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: var(--bg);
  box-shadow: 0 18px 50px rgb(0 0 0 / 35%);
}

.palette__field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--rule);
}

.palette__input {
  flex: 1;
  height: 52px;
  border: 0;
  outline: none;
  background: none;
  font-size: 16px;
}

.palette__input::placeholder {
  color: var(--tx3);
}

.palette__esc,
.palette__footer,
.palette__meta,
.palette__chip {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}

.palette__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--rule);
}

.palette__chip {
  padding: 2px 8px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: none;
  cursor: pointer;
}

.palette__chip--active {
  border-color: var(--tx2);
  color: var(--tx);
}

.palette__chip:disabled {
  cursor: default;
  opacity: 0.4;
}

.palette__separator {
  width: 1px;
  height: 14px;
  margin: 0 6px;
  background: var(--rule);
}

.palette__results {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0 8px;
}

.palette__group {
  display: block;
  padding: 12px 16px 6px;
}

.palette__item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 8px 16px;
  border: 0;
  border-left: 2px solid transparent;
  background: none;
  text-align: left;
  cursor: pointer;
}

.palette__item[data-active='true'] {
  border-left-color: var(--acc);
  background: var(--sel-bg);
}

.palette__title {
  font-weight: 500;
}

.palette__snippet {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 13px;
  color: var(--tx2);
}

.palette__snippet mark {
  padding: 0 1px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--acc) 22%, transparent);
  color: var(--tx);
}

.palette__note {
  margin: 0;
  padding: 18px 16px;
  font-size: 13px;
  color: var(--tx3);
}

.palette__note--error {
  color: var(--acc);
}

.palette__footer {
  padding: 8px 16px;
  border-top: 1px solid var(--rule);
}
</style>
