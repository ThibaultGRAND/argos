<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SearchPalette from './features/search/SearchPalette.vue'
import FirstRunDialog from './features/settings/FirstRunDialog.vue'
import AppShell from './layouts/AppShell.vue'
import { useAppStatusStore } from './stores/app-status'
import { useHistoryStore } from './stores/history'
import { useSearchStore } from './stores/search'
import { useSessionStore } from './stores/session'
import { usePreferencesStore } from './stores/preferences'

const appStatus = useAppStatusStore()
const preferences = usePreferencesStore()
const history = useHistoryStore()
const session = useSessionStore()
const search = useSearchStore()
const router = useRouter()
const ready = ref(false)

const macos = computed(() => appStatus.info?.platform === 'darwin')

/**
 * Raccourcis globaux : ⌘K / Ctrl+K ouvre ou ferme la recherche, ⌘, / Ctrl+, ouvre les paramètres.
 */
function onGlobalKeydown(event: KeyboardEvent): void {
  const modifier = macos.value ? event.metaKey : event.ctrlKey
  if (modifier && event.key === ',') {
    event.preventDefault()
    void router.push({ name: 'settings' })
    return
  }
  if (modifier && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (search.isOpen) search.close()
    else search.open()
  }
}

onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

onMounted(async () => {
  window.addEventListener('keydown', onGlobalKeydown)
  await Promise.all([preferences.load(), appStatus.load()])
  history.watchIndex()
  session.watchIndex()
  await history.loadProjects()
  ready.value = true
})
</script>

<template>
  <AppShell v-if="ready" :macos="macos">
    <RouterView />
  </AppShell>
  <SearchPalette v-if="ready && search.isOpen" />
  <FirstRunDialog v-if="ready && !preferences.preferences.firstRunCompleted" />
</template>
