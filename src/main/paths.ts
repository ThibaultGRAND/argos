import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

export interface AppPaths {
  readonly userData: string
  readonly indexDb: string
  readonly argosDb: string
  readonly backups: string
  readonly logs: string
  readonly argosMigrations: string
}

/** Emplacements par OS, toujours obtenus par Electron (PLAN.md §2.4). */
export function resolveAppPaths(): AppPaths {
  const userData = app.getPath('userData')
  const paths: AppPaths = {
    userData,
    indexDb: join(userData, 'index.db'),
    argosDb: join(userData, 'argos.db'),
    backups: join(userData, 'backups'),
    logs: join(userData, 'logs'),
    argosMigrations: app.isPackaged
      ? join(process.resourcesPath, 'migrations', 'argos')
      : join(app.getAppPath(), 'src', 'infrastructure', 'database', 'argos', 'migrations'),
  }
  mkdirSync(paths.userData, { recursive: true })
  mkdirSync(paths.logs, { recursive: true })
  return paths
}
