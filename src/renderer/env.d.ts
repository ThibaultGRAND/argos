/// <reference types="vite/client" />
import type { ArgosApi } from '@shared/contract'

declare global {
  interface Window {
    readonly argos: ArgosApi
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

export {}
