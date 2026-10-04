import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateChannel, UpdateChannelListener } from '../../core/domain/ports/update-channel'
import { updateModeFor, type Platform, type UpdateMode } from '../../core/domain/updates/update'

const platformOf = (value: NodeJS.Platform): Platform =>
  value === 'darwin' || value === 'win32' || value === 'linux' ? value : 'other'

/**
 * Mises à jour par electron-updater, depuis les GitHub Releases (F09, `publish` de config/electron-builder.yml).
 * Téléchargement et installation seulement en mode automatique (Windows, AppImage) : ailleurs, l'app signale la version.
 */
export class ElectronUpdateChannel implements UpdateChannel {
  readonly supported = app.isPackaged
  readonly mode: UpdateMode = updateModeFor(platformOf(process.platform), process.env['APPIMAGE'] !== undefined)
  private listener: UpdateChannelListener | undefined
  private pendingVersion: string | undefined
  /** Pendant une vérification, son erreur remonte par la promesse : l'événement `error` ne la double pas. */
  private checking = false

  constructor(log: (message: string) => void) {
    autoUpdater.autoDownload = this.mode === 'automatic'
    autoUpdater.autoInstallOnAppQuit = this.mode === 'automatic'
    autoUpdater.logger = { info: log, warn: log, error: log, debug: () => undefined }
    autoUpdater.on('update-available', (info) => {
      this.pendingVersion = info.version
    })
    autoUpdater.on('download-progress', (progress) => {
      if (this.pendingVersion !== undefined)
        this.listener?.onProgress(this.pendingVersion, Math.round(progress.percent))
    })
    autoUpdater.on('update-downloaded', (info) => this.listener?.onDownloaded(info.version))
    autoUpdater.on('error', (error) => {
      if (!this.checking) this.listener?.onError(error.message)
    })
  }

  setListener(listener: UpdateChannelListener): void {
    this.listener = listener
  }

  async check(): Promise<string | null> {
    this.checking = true
    try {
      const result = await autoUpdater.checkForUpdates()
      return result?.isUpdateAvailable === true ? result.updateInfo.version : null
    } catch (error) {
      // Aucune version publiée sur GitHub : l'app installée est forcément à jour.
      // electron-updater pose un code sur un seul de ses deux chemins ; l'autre ne laisse que le message.
      if (errorCode(error) === 'ERR_UPDATER_NO_PUBLISHED_VERSIONS' || messageOf(error).includes(NO_PUBLISHED)) {
        return null
      }
      throw error
    } finally {
      this.checking = false
    }
  }

  installAndRestart(): void {
    autoUpdater.quitAndInstall()
  }
}

const NO_PUBLISHED = 'No published versions on GitHub'
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))
const errorCode = (error: unknown): unknown =>
  typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
