import type { AppInfo } from '../app/app-info'

/** Informations sur l'app en cours d'exécution. */
export interface AppMetadata {
  read(): AppInfo
}
