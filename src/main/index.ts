import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { compose, type Composition } from './composition'
import { broadcast, registerRequestHandlers } from './ipc/register'
import { IndexerSupervisor } from './indexer-supervisor'
import { resolveAppPaths } from './paths'
import { createMainWindow } from './windows/main-window'

// En développement, données séparées de l'app installée : les tests ne touchent jamais les vraies données.
if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), 'Argos-dev'))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let composition: Composition | undefined
let indexer: IndexerSupervisor | undefined

app.whenReady().then(
  () => {
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
    composition = compose(paths, indexer)
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
