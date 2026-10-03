import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

export interface AppPaths {
  readonly userData: string
  readonly indexDb: string
  readonly argosDb: string
  readonly backups: string
  readonly logs: string
  readonly shadowGit: string
  readonly argosMigrations: string
  readonly indexMigrations: string
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
    shadowGit: join(userData, 'shadow-git'),
    argosMigrations: migrationsFolder('argos'),
    indexMigrations: migrationsFolder('index'),
  }
  mkdirSync(paths.userData, { recursive: true })
  mkdirSync(paths.logs, { recursive: true })
  return paths
}

/** Les migrations sont copiées dans les ressources de l'app packagée (config/electron-builder.yml). */
function migrationsFolder(database: 'argos' | 'index'): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'migrations', database)
    : join(app.getAppPath(), 'src', 'infrastructure', 'database', database, 'migrations')
}
