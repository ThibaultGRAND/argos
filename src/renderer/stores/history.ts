import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ContractError, ProjectSummaryDto, SessionSummaryDto } from '@shared/contract'
import { argos, ArgosRequestError, unwrap } from '../services/argos'

/** État d'affichage de l'historique : projet sélectionné, sessions chargées, filtre. */
export const useHistoryStore = defineStore('history', () => {
  const projects = ref<ProjectSummaryDto[]>([])
  const selectedProjectId = ref<number | undefined>()
  const sessions = ref<SessionSummaryDto[]>([])
  const selectedSessionId = ref<number | undefined>()
  const query = ref('')
  const error = ref<ContractError | undefined>()

  const selectedProject = computed(() => projects.value.find((project) => project.id === selectedProjectId.value))

  async function guarded(action: () => Promise<void>): Promise<void> {
    try {
      error.value = undefined
      await action()
    } catch (caught) {
      if (caught instanceof ArgosRequestError) error.value = caught.error
      else throw caught
    }
  }

  async function loadProjects(): Promise<void> {
    await guarded(async () => {
      projects.value = unwrap<'projects.list'>(await argos.invoke('projects.list'))
      // Conserve la sélection si le projet existe toujours, sinon prend le plus récent.
      if (!projects.value.some((project) => project.id === selectedProjectId.value)) {
        selectedProjectId.value = projects.value[0]?.id
        selectedSessionId.value = undefined
      }
    })
    await loadSessions()
  }

  async function loadSessions(): Promise<void> {
    const projectId = selectedProjectId.value
    if (projectId === undefined) {
      sessions.value = []
      return
    }
    await guarded(async () => {
      const filter = query.value.trim()
      sessions.value = unwrap<'sessions.list'>(
        await argos.invoke('sessions.list', filter === '' ? { projectId } : { projectId, query: filter }),
      )
    })
  }

  async function selectProject(projectId: number): Promise<void> {
    selectedProjectId.value = projectId
    selectedSessionId.value = undefined
    query.value = ''
    await loadSessions()
  }

  function selectSession(sessionId: number): void {
    selectedSessionId.value = sessionId
  }

  /** Session ouverte depuis un autre projet (lien, recherche) : affiche ce projet dans la barre latérale. */
  async function revealProject(projectId: number): Promise<void> {
    if (selectedProjectId.value === projectId) return
    selectedProjectId.value = projectId
    query.value = ''
    await loadSessions()
  }

  async function setQuery(value: string): Promise<void> {
    query.value = value
    await loadSessions()
  }

  /** L'index a changé (import en arrière-plan) : recharge sans perdre la sélection. */
  function watchIndex(): void {
    argos.on('index.updated', () => void loadProjects())
  }

  return {
    projects,
    selectedProjectId,
    selectedProject,
    sessions,
    selectedSessionId,
    query,
    error,
    loadProjects,
    selectProject,
    selectSession,
    revealProject,
    setQuery,
    watchIndex,
  }
})
