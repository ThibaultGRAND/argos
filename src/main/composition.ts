import { GetAppInfo } from '../core/application/app/get-app-info'
import { GetIndexerStatus } from '../core/application/indexer/get-indexer-status'
import { GetPreferences } from '../core/application/preferences/get-preferences'
import { UpdatePreferences } from '../core/application/preferences/update-preferences'
import type { IndexerMonitor } from '../core/domain/ports/indexer-monitor'
import { openArgosDatabase } from '../infrastructure/database/argos/argos-database'
import { SqlitePreferencesRepository } from '../infrastructure/database/argos/preferences-repository'
import { ElectronAppMetadata } from './adapters/electron-app-metadata'
import type { RequestHandlers } from './ipc/register'
import type { AppPaths } from './paths'

export interface Composition {
  readonly handlers: RequestHandlers
  dispose(): void
}

/** Racine de composition : branche les adaptateurs sur les cas d'usage (injection manuelle). */
export function compose(paths: AppPaths, indexer: IndexerMonitor): Composition {
  const argosDb = openArgosDatabase({
    path: paths.argosDb,
    migrationsFolder: paths.argosMigrations,
    backupDirectory: paths.backups,
  })

  const preferencesRepository = new SqlitePreferencesRepository(argosDb.database)
  const getAppInfo = new GetAppInfo(new ElectronAppMetadata())
  const getPreferences = new GetPreferences(preferencesRepository)
  const updatePreferences = new UpdatePreferences(preferencesRepository)
  const getIndexerStatus = new GetIndexerStatus(indexer)

  const handlers: RequestHandlers = {
    'app.info': () => getAppInfo.execute(),
    'preferences.get': () => getPreferences.execute(),
    'preferences.update': (changes) => updatePreferences.execute(withoutUndefined(changes)),
    'indexer.status': () => ({ state: getIndexerStatus.execute() }),
  }

  return { handlers, dispose: () => argosDb.close() }
}

/** Zod garde les clés absentes à `undefined` ; le domaine attend des champs vraiment absents. */
function withoutUndefined<T extends object>(value: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>
  }
}
