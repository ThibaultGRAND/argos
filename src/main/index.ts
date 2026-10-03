import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { compose, type Composition } from './composition'
import { broadcast, registerRequestHandlers } from './ipc/register'
import { IndexerSupervisor } from './indexer-supervisor'
import type { LiveEvent } from '../core/domain/live/live-events'
import { loadShellEnvironment } from '../infrastructure/system/shell-environment'
import type { LiveEventDto } from '../shared/contract'
import { resolveAppPaths } from './paths'
import { createMainWindow } from './windows/main-window'

// En développement, données séparées de l'app installée : les tests ne touchent jamais les vraies données.
if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), 'Argos-dev'))
}

// Windows : identifiant de l'app, nécessaire aux notifications (F14).
app.setAppUserModelId('com.thibaultgrand.argos')

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let composition: Composition | undefined
let indexer: IndexerSupervisor | undefined

app.whenReady().then(
  async () => {
    const paths = resolveAppPaths()
    // Journal technique uniquement : jamais de contenu de conversation (PLAN.md §2.4).
    const log = (message: string): void => {
      appendFileSync(join(paths.logs, 'main.log'), `${new Date().toISOString()} ${message}\n`)
    }

    indexer = new IndexerSupervisor(paths.indexDb, paths.indexMigrations, {
      onStatusChange: (status) => broadcast('indexer.status', status),
      onIndexUpdated: (sessionsChanged) => broadcast('index.updated', { sessionsChanged }),
      log,
    })
    // Environnement du terminal (PATH…) pour que les agents trouvent leurs outils, même lancé depuis le Finder.
    const environment = await loadShellEnvironment()
    composition = compose({
      paths,
      indexer,
      environment,
      liveListener: { onEvent: (runId, event) => broadcast('live.event', { runId, event: toLiveEventDto(event) }) },
      onSnapshotsChanged: (sessionExternalId) => broadcast('snapshots.updated', { sessionExternalId }),
      openSession: (sessionId) => {
        const [window] = BrowserWindow.getAllWindows()
        if (window !== undefined) {
          if (window.isMinimized()) window.restore()
          window.show()
          window.focus()
        }
        broadcast('app.navigate', { sessionId })
      },
      log,
    })
    registerRequestHandlers(composition.handlers, log)
    indexer.start()

    createMainWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
    app.on('second-instance', () => {
      const [window] = BrowserWindow.getAllWindows()
      if (window === undefined) return
      if (window.isMinimized()) window.restore()
      window.focus()
    })
  },
  (error: unknown) => {
    console.error('Démarrage impossible', error)
    app.quit()
  },
)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  indexer?.stop()
  composition?.dispose()
})

/** Les événements du domaine sont en lecture seule ; le contrat IPC attend des tableaux modifiables. */
function toLiveEventDto(event: LiveEvent): LiveEventDto {
  return event.type === 'tool-result' ? { ...event, fileChanges: [...event.fileChanges] } : event
}
