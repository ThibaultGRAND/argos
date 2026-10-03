import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ArgosApi } from '../shared/contract/api'
import {
  eventChannel,
  eventNames,
  requestChannel,
  requestNames,
  type EventName,
  type RequestName,
} from '../shared/contract/channels'
import { fail } from '../shared/contract/result'

const knownRequests: ReadonlySet<string> = new Set(requestNames)
const knownEvents: ReadonlySet<string> = new Set(eventNames)

/** `window.argos` est généré à partir du contrat : aucun canal non déclaré n'est accessible (PLAN.md §2.3). */
const api: ArgosApi = {
  invoke: (name: RequestName, ...args: unknown[]) => {
    if (!knownRequests.has(name)) {
      return Promise.resolve(fail({ code: 'unknown_request', messageKey: 'errors.unknown_request' }))
    }
    return ipcRenderer.invoke(requestChannel(name), args[0])
  },
  on: (name: EventName, listener: (payload: unknown) => void) => {
    if (!knownEvents.has(name)) return () => undefined
    const channel = eventChannel(name)
    // Le contenu a été validé par le processus principal avant l'envoi (broadcast).
    const handler = (_event: IpcRendererEvent, payload: unknown): void => listener(payload)
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },
} as ArgosApi

contextBridge.exposeInMainWorld('argos', api)
