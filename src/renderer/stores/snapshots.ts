import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SnapshotDto } from '@shared/contract'
import { argos, unwrap } from '../services/argos'

/** Snapshots de la session ouverte (F06). */
export const useSnapshotsStore = defineStore('snapshots', () => {
  const sessionExternalId = ref<string | undefined>()
  const available = ref(true)
  const snapshots = ref<SnapshotDto[]>([])

  async function load(externalId: string | undefined): Promise<void> {
    sessionExternalId.value = externalId
    if (externalId === undefined) {
      snapshots.value = []
      return
    }
    const list = unwrap<'snapshots.list'>(await argos.invoke('snapshots.list', { sessionExternalId: externalId }))
    if (sessionExternalId.value !== externalId) return
    available.value = list.available
    snapshots.value = list.snapshots
  }

  async function restore(snapshotId: string): Promise<SnapshotDto> {
    return unwrap<'snapshots.restore'>(await argos.invoke('snapshots.restore', { snapshotId }))
  }

  function watchUpdates(): void {
    argos.on('snapshots.updated', ({ sessionExternalId: changed }) => {
      if (changed === sessionExternalId.value) void load(changed)
    })
  }

  return { sessionExternalId, available, snapshots, load, restore, watchUpdates }
})
