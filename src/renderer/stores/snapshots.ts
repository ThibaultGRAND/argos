import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RestoreInputDto, SessionChangesDto } from '@shared/contract'
import { argos, unwrap } from '../services/argos'

/** Retour en arrière en attente de confirmation, avec ses textes (clés de traduction). */
export interface RestoreRequest {
  readonly action: RestoreInputDto
  readonly titleKey: string
  readonly bodyKey: string
  readonly doneKey: string
  readonly params?: Readonly<Record<string, string>>
}

/** Modifications de la session ouverte (features/agent_changes.md) : panneau D, lignes des tours, retours en arrière. */
export const useSnapshotsStore = defineStore('snapshots', () => {
  const sessionExternalId = ref<string | undefined>()
  const changes = ref<SessionChangesDto | undefined>()
  const request = ref<RestoreRequest | undefined>()

  async function load(externalId: string | undefined): Promise<void> {
    sessionExternalId.value = externalId
    if (externalId === undefined) {
      changes.value = undefined
      return
    }
    const loaded = unwrap<'snapshots.changes'>(
      await argos.invoke('snapshots.changes', { sessionExternalId: externalId }),
    )
    if (sessionExternalId.value === externalId) changes.value = loaded
  }

  /** Retour en arrière, puis relecture des modifications (le disque a changé). */
  async function restore(action: RestoreInputDto): Promise<void> {
    // Copie simple : une demande gardée dans le store est réactive et ne traverserait pas le pont IPC.
    const plain: RestoreInputDto = action.kind === 'files' ? { ...action, paths: [...action.paths] } : { ...action }
    unwrap<'snapshots.restore'>(await argos.invoke('snapshots.restore', plain))
    await load(sessionExternalId.value)
  }

  /** Demande une confirmation avant un retour ; la boîte de dialogue de la session l'affiche. */
  function ask(next: RestoreRequest): void {
    request.value = next
  }

  function dismiss(): RestoreRequest | undefined {
    const current = request.value
    request.value = undefined
    return current
  }

  function watchUpdates(): void {
    argos.on('snapshots.updated', ({ sessionExternalId: changed }) => {
      if (changed === sessionExternalId.value) void load(changed)
    })
  }

  return { sessionExternalId, changes, request, load, restore, ask, dismiss, watchUpdates }
})
