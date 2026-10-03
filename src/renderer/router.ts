import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './features/home/HomeView.vue'
import SessionView from './features/session/SessionView.vue'
import SettingsView from './features/settings/SettingsView.vue'
import NewSessionView from './features/live/NewSessionView.vue'

/** Mode hash : fonctionne sans serveur, depuis les fichiers de l'app (PLAN.md §2.1). */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/new', name: 'new', component: NewSessionView },
    {
      path: '/sessions/:id(\\d+)',
      name: 'session',
      component: SessionView,
      props: (route) => {
        const seq = Number(route.query['seq'])
        return { id: Number(route.params['id']), seq: Number.isInteger(seq) ? seq : undefined }
      },
    },
  ],
})
