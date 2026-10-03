import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { app, BrowserWindow, nativeImage } from 'electron'

/** Fenêtre principale, avec les protections de PLAN.md §2.1. */
/** Icône d'Argos : dans les ressources de l'app packagée, dans `build/` en développement. */
function iconPath(): string | undefined {
  const path = app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(app.getAppPath(), 'build', 'icon-mac.png')
  return existsSync(path) ? path : undefined
}

export function createMainWindow(): BrowserWindow {
  const icon = iconPath()
  // En développement sur macOS, le Dock afficherait l'icône d'Electron.
  if (!app.isPackaged && process.platform === 'darwin' && icon !== undefined) {
    app.dock?.setIcon(nativeImage.createFromPath(icon))
  }
  const window = new BrowserWindow({
    ...(icon === undefined || process.platform === 'darwin' ? {} : { icon }),
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#1C1A17',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  })

  window.once('ready-to-show', () => window.show())

  // Aucun contenu distant : pas de navigation ni de nouvelle fenêtre.
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (devServerUrl !== undefined) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return window
}
