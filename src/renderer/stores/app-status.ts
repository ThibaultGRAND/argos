import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppInfoDto, IndexerStatusDto } from '@shared/contract'
import { argos, unwrap } from '../services/argos'

export const useAppStatusStore = defineStore('app-status', () => {
  const info = ref<AppInfoDto | undefined>()
  const indexer = ref<IndexerStatusDto>({ state: 'starting' })

  async function load(): Promise<void> {
    info.value = unwrap<'app.info'>(await argos.invoke('app.info'))
    indexer.value = unwrap<'indexer.status'>(await argos.invoke('indexer.status'))
    argos.on('indexer.status', (status) => {
      indexer.value = status
    })
  }

  return { info, indexer, load }
})
