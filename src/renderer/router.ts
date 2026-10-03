import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './features/home/HomeView.vue'

/** Mode hash : fonctionne sans serveur, depuis les fichiers de l'app (PLAN.md §2.1). */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', name: 'home', component: HomeView }],
})
