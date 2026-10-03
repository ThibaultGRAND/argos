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
import { GetEnvironment } from '../core/application/settings/get-environment'
import { RebuildIndex } from '../core/application/settings/rebuild-index'
import type { IndexerControl } from '../core/domain/ports/indexer-control'
import type { IndexerMonitor } from '../core/domain/ports/indexer-monitor'
import { openArgosDatabase } from '../infrastructure/database/argos/argos-database'
import { SqlitePreferencesRepository } from '../infrastructure/database/argos/preferences-repository'
import { SqliteSnapshotRepository } from '../infrastructure/database/argos/snapshot-repository'
import { SqliteReviewCommentRepository } from '../infrastructure/database/argos/review-comment-repository'
import { GitShadowRepository } from '../infrastructure/git/git-shadow-repository'
import { ReadOnlySessionQueries } from '../infrastructure/database/index/read-only-session-queries'
import { NodePathInspector } from '../infrastructure/filesystem/path-inspector'
import { ClaudeAgentRuntime } from '../infrastructure/providers/claude/claude-agent-runtime'
import { findClaudeExecutable } from '../infrastructure/system/claude-executable'
import { resolveClaudeProjectsDirectory } from '../infrastructure/system/claude-paths'
import { ElectronEditorLauncher } from './adapters/electron-editor-launcher'
import { ElectronAppMetadata } from './adapters/electron-app-metadata'
import { ElectronLinkOpener } from './adapters/electron-link-opener'
import type { RequestHandlers } from './ipc/register'
import type { Snapshot } from '../core/domain/snapshots/snapshot'
import type { ReviewCommentDto, SnapshotDto } from '../shared/contract'
import type { ReviewComment } from '../core/domain/review/review-comment'
import type { AppPaths } from './paths'

export interface Composition {
  readonly handlers: RequestHandlers
  dispose(): void
}

export interface CompositionContext {
  readonly paths: AppPaths
  readonly indexer: IndexerMonitor & IndexerControl & { requestImport(): void }
  /** Environnement du shell de connexion, transmis aux agents (F05). */
  readonly environment: NodeJS.ProcessEnv
  readonly liveListener: Pick<LiveSessionsListener, 'onEvent'>
  readonly onSnapshotsChanged: (sessionExternalId: string) => void
  readonly log: (message: string) => void
}

/** Racine de composition : branche les adaptateurs sur les cas d'usage (injection manuelle). */
export function compose({
  paths,
  indexer,
  environment,
  liveListener,
  onSnapshotsChanged,
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
  const shadow = new GitShadowRepository({ root: paths.shadowGit, environment })
  const snapshotRepository = new SqliteSnapshotRepository(argosDb.database)
  const snapshotService = new SnapshotService({
    shadow,
    repository: snapshotRepository,
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
        if (event.type === 'identified') {
          snapshotService.identified(runId, event.sessionExternalId)
          // Dès que la session a un identifiant, son fichier existe : l'import la fait apparaître dans la liste.
          indexer.requestImport()
        }
      },
      // Fin d'un tour : snapshot des fichiers (F06), puis import de l'historique écrit par la CLI (PLAN.md §2.3, flux D).
      onTurnCompleted: (runId) => {
        void snapshotService.afterTurn(runId)
        indexer.requestImport()
      },
    },
    randomUUID,
  )
  const liveCommands = new LiveCommands(liveSessions, sessionQueries, snapshotService)
  const reviewService = new ReviewService({
    shadow,
    snapshots: snapshotRepository,
    comments: new SqliteReviewCommentRepository(argosDb.database),
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
    'snapshots.list': async ({ sessionExternalId }) => {
      const list = await snapshotService.list(sessionExternalId)
      return { available: list.available, snapshots: list.snapshots.map(toSnapshotDto) }
    },
    'review.diff': async ({ sessionExternalId, fromId, toId }) => {
      const diff = await reviewService.diff(sessionExternalId, fromId, toId)
      return {
        snapshots: diff.snapshots.map(toSnapshotDto),
        fromId: diff.from?.id ?? null,
        toId: diff.to?.id ?? null,
        files: diff.files.map((file) => ({
          ...file,
          hunks: file.hunks.map((hunk) => ({ ...hunk, lines: [...hunk.lines] })),
        })),
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
    'snapshots.restore': async ({ snapshotId }) => toSnapshotDto(await snapshotService.restore(snapshotId)),
    'live.send': ({ runId, text }) => {
      liveSessions.send(runId, text)
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
    'links.open': async ({ url }) => {
      await openExternalLink.execute(url)
      return undefined
    },
  }

  return {
    handlers,
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

/** Le commit parent et le fournisseur restent internes au processus principal. */
function toSnapshotDto(snapshot: Snapshot): SnapshotDto {
  return {
    id: snapshot.id,
    projectPath: snapshot.projectPath,
    sessionExternalId: snapshot.sessionExternalId,
    ordinal: snapshot.ordinal,
    kind: snapshot.kind,
    commitHash: snapshot.commitHash,
    filesChanged: snapshot.filesChanged,
    linesAdded: snapshot.linesAdded,
    linesRemoved: snapshot.linesRemoved,
    createdAt: snapshot.createdAt,
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
