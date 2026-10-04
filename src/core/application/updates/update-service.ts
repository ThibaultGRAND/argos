import type { ExternalLinkOpener } from '../../domain/ports/external-link-opener'
import type { PreferencesRepository } from '../../domain/ports/preferences-repository'
import type { UpdateChannel } from '../../domain/ports/update-channel'
import { releasePageUrl, UPDATE_CHECK_INTERVAL_MS, type UpdateState } from '../../domain/updates/update'

export interface UpdateServiceDependencies {
  readonly channel: UpdateChannel
  readonly preferences: PreferencesRepository
  readonly links: ExternalLinkOpener
  /** Adresse du dépôt GitHub (package.json), pour la page de téléchargement. */
  readonly repositoryUrl: string
  readonly now: () => Date
  /** Répète une action ; renvoie de quoi l'arrêter. */
  readonly every: (intervalMs: number, action: () => void) => () => void
  readonly onState: (state: UpdateState) => void
  readonly log: (message: string) => void
}

/** Vérification et installation des mises à jour (F09). */
export class UpdateService {
  private state: UpdateState
  private stopTimer: (() => void) | undefined

  constructor(private readonly deps: UpdateServiceDependencies) {
    this.state = deps.channel.supported ? { kind: 'idle' } : { kind: 'unsupported' }
    deps.channel.setListener({
      onProgress: (version, percent) => this.set({ kind: 'downloading', version, percent }),
      onDownloaded: (version) => this.set({ kind: 'ready', version }),
      onError: (message) => this.fail(message),
    })
  }

  current(): UpdateState {
    return this.state
  }

  /** Au démarrage : une vérification, puis toutes les 6 heures, si l'utilisateur ne l'a pas désactivé. */
  async start(): Promise<void> {
    if (!this.deps.channel.supported) return
    this.stopTimer = this.deps.every(UPDATE_CHECK_INTERVAL_MS, () => void this.automaticCheck())
    await this.automaticCheck()
  }

  stop(): void {
    this.stopTimer?.()
    this.stopTimer = undefined
  }

  /** « Vérifier maintenant » : ignore la préférence, jamais pendant un téléchargement. */
  async check(): Promise<UpdateState> {
    if (!this.deps.channel.supported) return this.state
    if (this.state.kind === 'checking' || this.state.kind === 'downloading' || this.state.kind === 'ready') {
      return this.state
    }
    this.set({ kind: 'checking' })
    try {
      const version = await this.deps.channel.check()
      // Le téléchargement a pu avancer pendant la vérification (écouteur) : on ne recule pas.
      if (this.current().kind !== 'checking') return this.state
      this.set(
        version === null
          ? { kind: 'up-to-date', checkedAt: this.deps.now().toISOString() }
          : { kind: 'available', version, mode: this.deps.channel.mode },
      )
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error))
    }
    return this.state
  }

  /** Version prête : installe et relance. Version à télécharger : ouvre sa page sur GitHub. */
  async install(): Promise<void> {
    const state = this.state
    if (state.kind === 'ready') this.deps.channel.installAndRestart()
    else if (state.kind === 'available' && state.mode === 'manual') {
      await this.deps.links.open(releasePageUrl(this.deps.repositoryUrl, state.version))
    }
  }

  private async automaticCheck(): Promise<void> {
    const { updates } = await this.deps.preferences.load()
    if (updates) await this.check()
  }

  private fail(message: string): void {
    this.deps.log(`Mise à jour : ${message}`)
    this.set({ kind: 'error', message, checkedAt: this.deps.now().toISOString() })
  }

  private set(state: UpdateState): void {
    this.state = state
    this.deps.onState(state)
  }
}
