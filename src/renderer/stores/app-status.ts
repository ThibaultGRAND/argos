import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppInfoDto, IndexerStatusDto, UpdateStateDto } from '@shared/contract'
import { argos, unwrap } from '../services/argos'

export const useAppStatusStore = defineStore('app-status', () => {
  const info = ref<AppInfoDto | undefined>()
  const indexer = ref<IndexerStatusDto>({ state: 'starting' })
  /** Mises à jour de l'app installée (F09). */
  const update = ref<UpdateStateDto>({ kind: 'idle' })

  async function load(): Promise<void> {
    info.value = unwrap<'app.info'>(await argos.invoke('app.info'))
    indexer.value = unwrap<'indexer.status'>(await argos.invoke('indexer.status'))
    argos.on('indexer.status', (status) => {
      indexer.value = status
    })
    update.value = unwrap<'updates.status'>(await argos.invoke('updates.status'))
    argos.on('updates.status', (state) => {
      update.value = state
    })
  }

  async function checkUpdates(): Promise<void> {
    update.value = unwrap<'updates.check'>(await argos.invoke('updates.check'))
  }

  /** Version prête : redémarre pour l'installer ; sinon, ouvre sa page de téléchargement. */
  async function installUpdate(): Promise<void> {
    unwrap<'updates.install'>(await argos.invoke('updates.install'))
  }

  return { info, indexer, update, load, checkUpdates, installUpdate }
})
