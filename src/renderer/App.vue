<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from './layouts/AppShell.vue'
import { useAppStatusStore } from './stores/app-status'
import { useHistoryStore } from './stores/history'
import { useSessionStore } from './stores/session'
import { usePreferencesStore } from './stores/preferences'

const appStatus = useAppStatusStore()
const preferences = usePreferencesStore()
const history = useHistoryStore()
const session = useSessionStore()
const ready = ref(false)

const macos = computed(() => appStatus.info?.platform === 'darwin')

onMounted(async () => {
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
</template>
