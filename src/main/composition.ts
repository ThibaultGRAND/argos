import { GetAppInfo } from '../core/application/app/get-app-info'
import { GetSessionDetail } from '../core/application/history/get-session-detail'
import { ListSessionEntries } from '../core/application/history/list-session-entries'
import { ListSessions } from '../core/application/history/list-sessions'
import { OpenExternalLink } from '../core/application/links/open-external-link'
import { GetIndexerStatus } from '../core/application/indexer/get-indexer-status'
import { GetPreferences } from '../core/application/preferences/get-preferences'
import { UpdatePreferences } from '../core/application/preferences/update-preferences'
import { ListProjects } from '../core/application/projects/list-projects'
import type { IndexerMonitor } from '../core/domain/ports/indexer-monitor'
import { openArgosDatabase } from '../infrastructure/database/argos/argos-database'
import { SqlitePreferencesRepository } from '../infrastructure/database/argos/preferences-repository'
import { ReadOnlySessionQueries } from '../infrastructure/database/index/read-only-session-queries'
import { ElectronAppMetadata } from './adapters/electron-app-metadata'
import { ElectronLinkOpener } from './adapters/electron-link-opener'
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
  const sessionQueries = new ReadOnlySessionQueries(paths.indexDb)

  const preferencesRepository = new SqlitePreferencesRepository(argosDb.database)
  const getAppInfo = new GetAppInfo(new ElectronAppMetadata())
  const getPreferences = new GetPreferences(preferencesRepository)
  const updatePreferences = new UpdatePreferences(preferencesRepository)
  const getIndexerStatus = new GetIndexerStatus(indexer)
  const listProjects = new ListProjects(sessionQueries)
  const listSessions = new ListSessions(sessionQueries)
  const getSessionDetail = new GetSessionDetail(sessionQueries)
  const listSessionEntries = new ListSessionEntries(sessionQueries)
  const openExternalLink = new OpenExternalLink(new ElectronLinkOpener())

  const handlers: RequestHandlers = {
    'app.info': () => getAppInfo.execute(),
    'preferences.get': () => getPreferences.execute(),
    'preferences.update': (changes) => updatePreferences.execute(withoutUndefined(changes)),
    'indexer.status': () => getIndexerStatus.execute(),
    'projects.list': () => [...listProjects.execute()],
    'sessions.list': ({ projectId, query }) => [...listSessions.execute(projectId, query)],
    'sessions.get': ({ sessionId }) => {
      const detail = getSessionDetail.execute(sessionId)
      return { ...detail, files: [...detail.files] }
    },
    'sessions.entries': ({ sessionId, afterSeq, limit }) => {
      const page = listSessionEntries.execute(sessionId, afterSeq, limit)
      return { ...page, entries: [...page.entries] }
    },
    'links.open': async ({ url }) => {
      await openExternalLink.execute(url)
      return undefined
    },
  }

  return {
    handlers,
    dispose: () => {
      sessionQueries.close()
      argosDb.close()
    },
  }
}

/** Zod garde les clés absentes à `undefined` ; le domaine attend des champs vraiment absents. */
function withoutUndefined<T extends object>(value: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>
  }
}
