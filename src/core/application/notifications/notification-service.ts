import type { LiveEvent } from '../../domain/live/live-events'
import { notificationFor } from '../../domain/notifications/notification'
import type { AppPresence, Notifier, Translator } from '../../domain/ports/notifier'
import type { PreferencesRepository } from '../../domain/ports/preferences-repository'

export interface RunInfo {
  readonly sessionExternalId: string | null
  readonly projectPath: string
  readonly waiting: boolean
}

export interface NotificationServiceDependencies {
  readonly notifier: Notifier
  readonly presence: AppPresence
  readonly translator: Translator
  readonly preferences: PreferencesRepository
  /** Sessions pilotées en ce moment, pour le badge et le titre. */
  readonly runs: () => ReadonlyMap<string, RunInfo>
  /** Titre affichable d'une session et son id dans l'index (null tant qu'elle n'est pas importée). */
  readonly describeSession: (run: RunInfo) => { readonly title: string; readonly sessionId: number | null }
  /** Ramène Argos au premier plan sur la session. */
  readonly open: (sessionId: number | null) => void
}

/** Notifications du système pour les sessions pilotées par Argos, et badge des sessions en attente (F14). */
export class NotificationService {
  constructor(private readonly deps: NotificationServiceDependencies) {}

  async onLiveEvent(runId: string, event: LiveEvent): Promise<void> {
    this.updateBadge()
    const run = this.deps.runs().get(runId)
    if (run === undefined) return
    const preferences = await this.deps.preferences.load()
    const session = this.deps.describeSession(run)
    const content = notificationFor(event, {
      enabled: preferences.notifications,
      appFocused: this.deps.presence.isFocused(),
      sessionTitle: session.title,
    })
    if (content === undefined) return
    const { language } = preferences
    this.deps.notifier.show(
      this.deps.translator.translate(language, content.titleKey, content.params),
      this.deps.translator.translate(language, content.bodyKey, content.params),
      () => this.deps.open(this.deps.describeSession(run).sessionId ?? session.sessionId),
    )
  }

  /** Nombre de sessions qui attendent une action. */
  updateBadge(): void {
    this.deps.presence.setBadge([...this.deps.runs().values()].filter((run) => run.waiting).length)
  }
}
