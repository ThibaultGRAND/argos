import { GetAppInfo } from '../core/application/app/get-app-info'
import { GetSessionDetail } from '../core/application/history/get-session-detail'
import { ListSessionEntries } from '../core/application/history/list-session-entries'
import { ListSessions } from '../core/application/history/list-sessions'
import { OpenExternalLink } from '../core/application/links/open-external-link'
import { SearchHistory } from '../core/application/search/search-history'
import { GetIndexerStatus } from '../core/application/indexer/get-indexer-status'
import { GetPreferences } from '../core/application/preferences/get-preferences'
import { UpdatePreferences } from '../core/application/preferences/update-preferences'
import { ListProjects } from '../core/application/projects/list-projects'
import { randomUUID } from 'node:crypto'
import { OpenInEditor } from '../core/application/editor/open-in-editor'
import { LiveCommands } from '../core/application/live/live-commands'
import { LiveSessions, type LiveSessionsListener } from '../core/application/live/live-sessions'
import { SnapshotService } from '../core/application/snapshots/snapshot-service'
import { ReviewService } from '../core/application/review/review-service'
import { NotificationService } from '../core/application/notifications/notification-service'
import { UsageService } from '../core/application/usage/usage-service'
import { resolveSessionTitle } from '../core/domain/history/session-title'
import { GetEnvironment } from '../core/application/settings/get-environment'
import { RebuildIndex } from '../core/application/settings/rebuild-index'
import type { IndexerControl } from '../core/domain/ports/indexer-control'
import type { IndexerMonitor } from '../core/domain/ports/indexer-monitor'
import { openArgosDatabase } from '../infrastructure/database/argos/argos-database'
import { SqlitePreferencesRepository } from '../infrastructure/database/argos/preferences-repository'
import { SqliteSnapshotRepository } from '../infrastructure/database/argos/snapshot-repository'
import { SqliteReviewCommentRepository } from '../infrastructure/database/argos/review-comment-repository'
import { SqliteReviewedFileRepository } from '../infrastructure/database/argos/reviewed-file-repository'
import { GitShadowRepository } from '../infrastructure/git/git-shadow-repository'
import { ReadOnlySessionQueries } from '../infrastructure/database/index/read-only-session-queries'
import { NodePathInspector } from '../infrastructure/filesystem/path-inspector'
import { ClaudeAgentRuntime } from '../infrastructure/providers/claude/claude-agent-runtime'
import { ClaudeUsageProbe } from '../infrastructure/providers/claude/claude-usage-probe'
import { findClaudeExecutable } from '../infrastructure/system/claude-executable'
import { resolveClaudeProjectsDirectory } from '../infrastructure/system/claude-paths'
import { ElectronEditorLauncher } from './adapters/electron-editor-launcher'
import { ElectronAppMetadata } from './adapters/electron-app-metadata'
import { ElectronLinkOpener } from './adapters/electron-link-opener'
import { ElectronAppPresence, ElectronNotifier } from './adapters/electron-notifier'
import { IntlifyTranslator } from './adapters/intlify-translator'
import type { RequestHandlers } from './ipc/register'
import type { TurnChange } from '../core/domain/snapshots/snapshot'
import type {
  ChangedFileDto,
  ContextBreakdownDto,
  FileDiffDto,
  PlanQuotaDto,
  ReviewCommentDto,
  TurnChangeDto,
} from '../shared/contract'
import type { FileDiff } from '../core/domain/review/diff'
import { ChangeAttribution } from '../core/application/snapshots/change-attribution'
import { levelOf, type ContextBreakdown, type PlanQuota } from '../core/domain/usage/usage'
import type { ReviewComment } from '../core/domain/review/review-comment'
import type { AppPaths } from './paths'

export interface Composition {
  readonly handlers: RequestHandlers
  /** Relit le quota de l'abonnement (au plus une fois par minute) : démarrage, retour au premier plan, minuterie. */
  refreshQuota(): void
  dispose(): void
}

export interface CompositionContext {
  readonly paths: AppPaths
  readonly indexer: IndexerMonitor & IndexerControl & { requestImport(): void }
  /** Environnement du shell de connexion, transmis aux agents (F05). */
  readonly environment: NodeJS.ProcessEnv
  readonly liveListener: Pick<LiveSessionsListener, 'onEvent'>
  readonly onSnapshotsChanged: (sessionExternalId: string) => void
  /** Ramène Argos au premier plan sur une session (clic sur une notification). */
  readonly openSession: (sessionId: number | null) => void
  readonly onQuota: (quota: PlanQuotaDto) => void
  readonly log: (message: string) => void
}

/** Racine de composition : branche les adaptateurs sur les cas d'usage (injection manuelle). */
export function compose({
  paths,
  indexer,
  environment,
  liveListener,
  onSnapshotsChanged,
  openSession,
  onQuota,
  log,
}: CompositionContext): Composition {
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
  const searchHistory = new SearchHistory(sessionQueries)
  const pathInspector = new NodePathInspector()
  const openInEditor = new OpenInEditor(
    preferencesRepository,
    sessionQueries,
    pathInspector,
    new ElectronEditorLauncher(),
  )
  const getEnvironment = new GetEnvironment(
    paths.userData,
    [
      { providerId: 'claude', directory: resolveClaudeProjectsDirectory() },
      { providerId: 'codex', directory: null },
      { providerId: 'gemini', directory: null },
    ],
    sessionQueries,
    pathInspector,
  )
  const rebuildIndex = new RebuildIndex(indexer)

  const executable = findClaudeExecutable(environment)
  log(executable === undefined ? 'CLI claude introuvable : binaire du SDK utilisé' : `CLI claude : ${executable}`)
  const usageService = new UsageService({
    probe: new ClaudeUsageProbe({ executable, environment }),
    now: () => new Date(),
    onQuota: (quota) => onQuota(toQuotaDto(quota)),
    log,
  })
  const shadow = new GitShadowRepository({ root: paths.shadowGit, environment })
  const snapshotRepository = new SqliteSnapshotRepository(argosDb.database)
  const attribution = new ChangeAttribution(shadow)
  const snapshotService = new SnapshotService({
    shadow,
    repository: snapshotRepository,
    attribution,
    activeProjects: () => liveSessions.activeProjects(),
    newId: randomUUID,
    now: () => new Date(),
    onChanged: onSnapshotsChanged,
    log,
  })
  const liveSessions: LiveSessions = new LiveSessions(
    new ClaudeAgentRuntime({ executable, environment }),
    {
      onEvent: (runId, event) => {
        liveListener.onEvent(runId, event)
        void notificationService.onLiveEvent(runId, event)
        if (event.type === 'context-windows') {
          for (const { model, contextWindow } of event.windows) usageService.rememberContextWindow(model, contextWindow)
        }
        if (event.type === 'identified') {
          snapshotService.identified(runId, event.sessionExternalId)
          // Dès que la session a un identifiant, son fichier existe : l'import la fait apparaître dans la liste.
          indexer.requestImport()
        }
      },
      // Fin d'un tour : capture des fichiers (features/agent_changes.md), puis import de l'historique écrit par la CLI (PLAN.md §2.3, flux D).
      onTurnCompleted: (runId) => {
        void snapshotService.afterTurn(runId)
        indexer.requestImport()
        void usageService.refreshQuota()
      },
    },
    randomUUID,
  )
  const notificationService: NotificationService = new NotificationService({
    notifier: new ElectronNotifier(),
    presence: new ElectronAppPresence(),
    translator: new IntlifyTranslator(),
    preferences: preferencesRepository,
    runs: () =>
      new Map(
        liveSessions.list().map((run) => [
          run.runId,
          {
            sessionExternalId: run.sessionExternalId,
            projectPath: run.projectPath,
            waiting: run.status === 'waiting',
          },
        ]),
      ),
    describeSession: (run) => {
      const sessionId =
        run.sessionExternalId === null ? undefined : sessionQueries.findSessionIdByExternal(run.sessionExternalId)
      const session = sessionId === undefined ? undefined : sessionQueries.getSession(sessionId)
      const title =
        session === undefined
          ? null
          : resolveSessionTitle({
              customTitle: session.customTitle,
              generatedTitle: session.generatedTitle,
              firstPrompt: session.firstPrompt,
            })
      // Session pas encore importée : le nom du dossier du projet sert de titre.
      return { title: title ?? (run.projectPath.split(/[\\/]/).pop() || run.projectPath), sessionId: sessionId ?? null }
    },
    open: openSession,
  })
  const liveCommands = new LiveCommands(liveSessions, sessionQueries, snapshotService)
  const reviewService = new ReviewService({
    shadow,
    attribution,
    snapshots: snapshotRepository,
    comments: new SqliteReviewCommentRepository(argosDb.database),
    reviewedFiles: new SqliteReviewedFileRepository(argosDb.database),
    preferences: preferencesRepository,
    sendToSession: (sessionId, text) => liveCommands.continueSession(sessionId, text),
    newId: randomUUID,
    now: () => new Date(),
  })

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
    'search.query': ({ query, projectId, period }) => {
      const results = searchHistory.execute({
        query,
        ...(projectId === undefined ? {} : { projectId }),
        ...(period === undefined ? {} : { period }),
      })
      return { sessions: [...results.sessions], messages: [...results.messages] }
    },
    'editor.open': async ({ path, line }) => {
      await openInEditor.execute(path, line)
      return undefined
    },
    'settings.environment': () => {
      const environment = getEnvironment.execute()
      return { ...environment, sources: [...environment.sources] }
    },
    'index.rebuild': () => {
      rebuildIndex.execute()
      return undefined
    },
    'live.start': async ({ projectId, text, model }) => ({
      runId: await liveCommands.startInProject(projectId, text, model),
    }),
    'live.continue': async ({ sessionId, text, model }) => ({
      runId: await liveCommands.continueSession(sessionId, text, model),
    }),
    'snapshots.changes': async ({ sessionExternalId }) => {
      const changes = await snapshotService.changes(sessionExternalId)
      return {
        available: changes.available,
        tracked: changes.tracked,
        startId: changes.start?.id ?? null,
        agentFiles: changes.agentFiles.map(({ file, alsoOutside }) => toChangedFile(file, alsoOutside)),
        otherFiles: changes.otherFiles.map((file) => toChangedFile(file, false)),
        truncated: changes.truncated,
        turns: changes.turns.map(toTurnDto),
        undoableId: changes.undoable?.id ?? null,
      }
    },
    'review.diff': async ({ sessionExternalId, range }) => {
      const diff = await reviewService.diff(sessionExternalId, range)
      return {
        range: diff.range,
        turns: diff.turns.map(toTurnDto),
        sinceReviewAvailable: diff.sinceReviewAvailable,
        fromId: diff.from?.id ?? null,
        toId: diff.to?.id ?? null,
        files: diff.files.map(({ file, alsoOutside, reviewed }) => toFileDiffDto(file, alsoOutside, reviewed)),
        otherFiles: diff.otherFiles.map((file) => toFileDiffDto(file, false, false)),
        truncated: diff.truncated,
      }
    },
    'review.comments.list': ({ sessionExternalId }) => reviewService.listComments(sessionExternalId).map(toCommentDto),
    'review.comments.add': (input) => toCommentDto(reviewService.addComment(input)),
    'review.comments.delete': ({ id }) => {
      reviewService.deleteComment(id)
      return undefined
    },
    'review.send': ({ sessionId, sessionExternalId }) => reviewService.send(sessionId, sessionExternalId),
    'snapshots.restore': async (action) => {
      await snapshotService.restore(action)
      return undefined
    },
    'review.files.mark': ({ sessionExternalId, path, blob }) => {
      reviewService.markFileReviewed(sessionExternalId, path, blob)
      return undefined
    },
    'review.files.unmark': ({ sessionExternalId, path }) => {
      reviewService.unmarkFileReviewed(sessionExternalId, path)
      return undefined
    },
    'review.markReviewed': ({ snapshotId }) => {
      reviewService.markReviewed(snapshotId)
      onSnapshotsChanged(snapshotRepository.get(snapshotId)?.sessionExternalId ?? '')
      return undefined
    },
    'live.send': async ({ runId, text }) => {
      await liveCommands.send(runId, text)
      return undefined
    },
    'live.interrupt': async ({ runId }) => {
      await liveSessions.interrupt(runId)
      return undefined
    },
    'live.stop': ({ runId }) => {
      liveSessions.stop(runId)
      return undefined
    },
    'live.answer': ({ runId, requestId, decision }) => {
      liveSessions.answer(runId, requestId, decision)
      return undefined
    },
    'live.list': () => liveSessions.list().map((run) => ({ ...run, pendingPermissions: [...run.pendingPermissions] })),
    'sessions.findByExternal': ({ externalId }) => ({
      sessionId: sessionQueries.findSessionIdByExternal(externalId) ?? null,
    }),
    'usage.quota': () => {
      void usageService.refreshQuota()
      const quota = usageService.currentQuota()
      return { quota: quota === null ? null : toQuotaDto(quota) }
    },
    'usage.contextGauge': ({ model, tokens }) => usageService.gauge(model, tokens),
    'usage.contextDetail': async ({ sessionExternalId }) => {
      const breakdown = await liveSessions.contextBreakdown(sessionExternalId)
      return { breakdown: breakdown === null ? null : toBreakdownDto(breakdown) }
    },
    'links.open': async ({ url }) => {
      await openExternalLink.execute(url)
      return undefined
    },
  }

  return {
    handlers,
    refreshQuota: () => void usageService.refreshQuota(),
    dispose: () => {
      liveSessions.stopAll()
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

function toChangedFile(file: FileDiff, alsoOutside: boolean): ChangedFileDto {
  const { path, oldPath, status, binary, additions, deletions } = file
  return { path, oldPath, status, binary, additions, deletions, alsoOutside }
}

function toFileDiffDto(file: FileDiff, alsoOutside: boolean, reviewed: boolean): FileDiffDto {
  return { ...file, alsoOutside, reviewed, hunks: file.hunks.map((hunk) => ({ ...hunk, lines: [...hunk.lines] })) }
}

/** Un tour, désigné par sa capture : les commits restent internes au processus principal. */
function toTurnDto({ snapshot, before }: TurnChange): TurnChangeDto {
  return {
    snapshotId: snapshot.id,
    beforeSnapshotId: before.id,
    label: snapshot.label,
    createdAt: snapshot.createdAt,
    filesChanged: snapshot.filesChanged,
    linesAdded: snapshot.linesAdded,
    linesRemoved: snapshot.linesRemoved,
  }
}

/** Les tableaux du domaine sont en lecture seule ; le contrat IPC attend des tableaux modifiables. */
function toQuotaDto(quota: PlanQuota): PlanQuotaDto {
  return {
    fetchedAt: quota.fetchedAt,
    windows: quota.windows.map((window) => ({ ...window, level: levelOf(window.utilization) })),
  }
}

function toBreakdownDto(breakdown: ContextBreakdown): ContextBreakdownDto {
  return {
    ...breakdown,
    categories: breakdown.categories.map((category) => ({ ...category })),
    memoryFiles: breakdown.memoryFiles.map((file) => ({ ...file })),
  }
}

/** Le fournisseur reste interne au processus principal. */
function toCommentDto(comment: ReviewComment): ReviewCommentDto {
  return {
    id: comment.id,
    sessionExternalId: comment.sessionExternalId,
    snapshotId: comment.snapshotId,
    filePath: comment.filePath,
    line: comment.line,
    side: comment.side,
    excerpt: comment.excerpt,
    body: comment.body,
    sentAt: comment.sentAt,
    createdAt: comment.createdAt,
  }
}
