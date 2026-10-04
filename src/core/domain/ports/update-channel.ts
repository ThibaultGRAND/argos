import type { UpdateMode } from '../updates/update'

export interface UpdateChannelListener {
  onProgress(version: string, percent: number): void
  onDownloaded(version: string): void
  onError(message: string): void
}

/** Source des mises à jour (F09) : les versions publiées sur GitHub Releases. */
export interface UpdateChannel {
  /** Faux en développement : rien n'est vérifié. */
  readonly supported: boolean
  readonly mode: UpdateMode
  /** Version plus récente que celle installée, ou `null`. En mode automatique, son téléchargement démarre. */
  check(): Promise<string | null>
  /** Installe la version téléchargée et relance l'app (mode automatique). */
  installAndRestart(): void
  setListener(listener: UpdateChannelListener): void
}
