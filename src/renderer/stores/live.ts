import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  LiveEventEnvelopeDto,
  LiveStatusDto,
  ModelChoiceDto,
  PermissionRequestDto,
  RunSummaryDto,
  TimelineEntryDto,
} from '@shared/contract'
import { argos, unwrap } from '../services/argos'

/** Élément affiché en direct, rattaché au tour pendant lequel il est arrivé. */
type LiveItem =
  | { readonly kind: 'user'; readonly turn: number; readonly text: string; readonly at: string }
  | { readonly kind: 'assistant'; readonly turn: number; readonly messageId: string; text: string; readonly at: string }
  | {
      readonly kind: 'tool'
      readonly turn: number
      readonly externalId: string
      readonly toolName: string
      readonly toolKind: string
      readonly target: string | null
      readonly summary: string | null
      status: 'pending' | 'success' | 'error'
      linesAdded: number
      linesRemoved: number
      readonly at: string
    }

export interface LiveRunView {
  readonly runId: string
  readonly projectPath: string
  sessionExternalId: string | null
  status: LiveStatusDto
  pendingPermissions: PermissionRequestDto[]
  items: LiveItem[]
  /** Numéro du tour en cours ; les tours précédents sont terminés. */
  turn: number
}

/** Statuts pendant lesquels l'agent travaille ou attend : l'historique de la session est figé. */
export const ACTIVE_STATUSES: readonly LiveStatusDto[] = ['starting', 'running', 'waiting']

/** Les entrées en direct sont numérotées loin après l'historique pour ne jamais se confondre avec lui. */
const LIVE_SEQ_BASE = 1_000_000_000

/** État d'affichage des sessions pilotées par Argos (F05). */
export const useLiveStore = defineStore('live', () => {
  const runs = ref<LiveRunView[]>([])
  /** Événements reçus avant que la session ne soit connue de l'interface : rejoués à son adoption. */
  const early = new Map<string, LiveEventEnvelopeDto[]>()

  const byRunId = (runId: string): LiveRunView | undefined => runs.value.find((run) => run.runId === runId)
  const runForSession = (externalId: string | undefined): LiveRunView | undefined =>
    externalId === undefined ? undefined : [...runs.value].reverse().find((run) => run.sessionExternalId === externalId)

  /** Nombre de sessions en cours et en attente d'une action, pour un projet. */
  const countsFor = (projectPath: string | undefined) =>
    computed(() => {
      const active = runs.value.filter((run) => run.projectPath === projectPath)
      return {
        running: active.filter((run) => run.status === 'starting' || run.status === 'running').length,
        waiting: active.filter((run) => run.status === 'waiting').length,
      }
    })

  function adopt(summary: RunSummaryDto): LiveRunView {
    const existing = byRunId(summary.runId)
    if (existing !== undefined) return existing
    const run: LiveRunView = {
      runId: summary.runId,
      projectPath: summary.projectPath,
      sessionExternalId: summary.sessionExternalId,
      status: summary.status,
      pendingPermissions: [...summary.pendingPermissions],
      items: [],
      turn: 0,
    }
    runs.value.push(run)
    const adopted = byRunId(summary.runId) ?? run
    for (const envelope of early.get(summary.runId) ?? []) apply(envelope)
    early.delete(summary.runId)
    return adopted
  }

  let syncTimer: ReturnType<typeof setTimeout> | undefined
  function scheduleSync(): void {
    if (syncTimer !== undefined) return
    syncTimer = setTimeout(() => {
      syncTimer = undefined
      void argos.invoke('live.list').then((result) => {
        if (result.ok) for (const summary of result.data) adopt(summary)
      })
    }, 100)
  }

  async function load(): Promise<void> {
    for (const summary of unwrap<'live.list'>(await argos.invoke('live.list'))) adopt(summary)
    argos.on('live.event', apply)
  }

  function apply(envelope: LiveEventEnvelopeDto): void {
    const { runId, event } = envelope
    const run = byRunId(runId)
    if (run === undefined) {
      early.set(runId, [...(early.get(runId) ?? []), envelope])
      // Session démarrée ailleurs que par la zone de saisie (review, autre fenêtre) : on va la chercher.
      scheduleSync()
      return
    }
    switch (event.type) {
      case 'status':
        run.status = event.status
        break
      case 'identified':
        run.sessionExternalId = event.sessionExternalId
        break
      case 'user-message':
        run.status = run.status === 'ended' ? run.status : 'running'
        run.items.push({ kind: 'user', turn: run.turn, text: event.text, at: event.occurredAt })
        break
      case 'assistant-delta': {
        const item = run.items.find((entry) => entry.kind === 'assistant' && entry.messageId === event.messageId)
        if (item?.kind === 'assistant') item.text += event.text
        else
          run.items.push({
            kind: 'assistant',
            turn: run.turn,
            messageId: event.messageId,
            text: event.text,
            at: new Date().toISOString(),
          })
        break
      }
      case 'assistant-text': {
        const item = run.items.find((entry) => entry.kind === 'assistant' && entry.messageId === event.messageId)
        if (item?.kind === 'assistant') item.text = event.text
        else
          run.items.push({
            kind: 'assistant',
            turn: run.turn,
            messageId: event.messageId,
            text: event.text,
            at: event.occurredAt,
          })
        break
      }
      case 'tool-call':
        run.items.push({
          kind: 'tool',
          turn: run.turn,
          externalId: event.externalId,
          toolName: event.toolName,
          toolKind: event.kind,
          target: event.target ?? null,
          summary: event.summary ?? null,
          status: 'pending',
          linesAdded: 0,
          linesRemoved: 0,
          at: event.occurredAt,
        })
        break
      case 'tool-result': {
        const item = run.items.find((entry) => entry.kind === 'tool' && entry.externalId === event.toolCallExternalId)
        if (item?.kind === 'tool') {
          item.status = event.status
          item.linesAdded = event.fileChanges.reduce((sum, change) => sum + change.linesAdded, 0)
          item.linesRemoved = event.fileChanges.reduce((sum, change) => sum + change.linesRemoved, 0)
        }
        break
      }
      case 'permission-requested':
        run.status = 'waiting'
        if (!run.pendingPermissions.some((request) => request.requestId === event.request.requestId)) {
          run.pendingPermissions.push(event.request)
        }
        break
      case 'permission-resolved':
        run.pendingPermissions = run.pendingPermissions.filter((request) => request.requestId !== event.requestId)
        if (run.status === 'waiting' && run.pendingPermissions.length === 0) run.status = 'running'
        break
      case 'turn-completed':
        run.status = event.isError ? 'error' : 'idle'
        run.turn += 1
        break
    }
  }

  /** Entrées en direct au format du compte rendu, pour les mêmes composants que l'historique. */
  function entriesOf(run: LiveRunView): TimelineEntryDto[] {
    return run.items.map((item, index): TimelineEntryDto => {
      const seq = LIVE_SEQ_BASE + index
      if (item.kind === 'tool') {
        return {
          kind: 'tool',
          seq,
          toolName: item.toolName,
          toolKind: item.toolKind,
          target: item.target,
          summary: item.summary,
          status: item.status,
          linesAdded: item.linesAdded,
          linesRemoved: item.linesRemoved,
          occurredAt: item.at,
        }
      }
      return {
        kind: 'message',
        seq,
        role: item.kind === 'user' ? 'user' : 'assistant',
        text: item.text,
        truncated: false,
        occurredAt: item.at,
      }
    })
  }

  /**
   * Début de ce que le direct affiche encore (1 s de marge) : l'historique importé est coupé avant ce moment,
   * pour ne jamais montrer deux fois les mêmes messages quand l'import a lieu en plein tour.
   */
  function liveStartOf(run: LiveRunView): number | undefined {
    if (run.items.length === 0) return undefined
    return Math.min(...run.items.map((item) => new Date(item.at).getTime())) - 1_000
  }

  /**
   * Retire l'affichage en direct des tours terminés que l'historique importé a rattrapés
   * (dernière entrée importée au moins aussi récente que le tour, à 2 s près).
   */
  function releaseCaughtUpTurns(run: LiveRunView, lastPersistedAt: string | undefined): void {
    if (lastPersistedAt === undefined) return
    const persisted = new Date(lastPersistedAt).getTime()
    const done = run.items.filter((item) => item.turn < run.turn)
    if (done.length === 0) return
    const newest = Math.max(...done.map((item) => new Date(item.at).getTime()))
    if (persisted >= newest - 2_000) run.items = run.items.filter((item) => item.turn >= run.turn)
  }

  async function start(projectId: number, text: string, model?: ModelChoiceDto): Promise<string> {
    const { runId } = unwrap<'live.start'>(
      await argos.invoke('live.start', model === undefined ? { projectId, text } : { projectId, text, model }),
    )
    return adoptStarted(runId)
  }

  async function continueSession(sessionId: number, text: string, model?: ModelChoiceDto): Promise<string> {
    const { runId } = unwrap<'live.continue'>(
      await argos.invoke('live.continue', model === undefined ? { sessionId, text } : { sessionId, text, model }),
    )
    return adoptStarted(runId)
  }

  /** Le premier message a pu arriver avant l'enregistrement local : on relit la liste pour l'adopter. */
  async function adoptStarted(runId: string): Promise<string> {
    if (byRunId(runId) === undefined) {
      // Les événements déjà reçus sont rejoués par adopt() : la liste ne sert qu'aux informations de la session.
      const summary = unwrap<'live.list'>(await argos.invoke('live.list')).find((run) => run.runId === runId)
      if (summary !== undefined) adopt(summary)
    }
    return runId
  }

  async function send(runId: string, text: string): Promise<void> {
    unwrap<'live.send'>(await argos.invoke('live.send', { runId, text }))
  }

  async function interrupt(runId: string): Promise<void> {
    unwrap<'live.interrupt'>(await argos.invoke('live.interrupt', { runId }))
  }

  async function stop(runId: string): Promise<void> {
    unwrap<'live.stop'>(await argos.invoke('live.stop', { runId }))
  }

  async function answer(runId: string, requestId: string, decision: 'allow' | 'allow-session' | 'deny'): Promise<void> {
    unwrap<'live.answer'>(await argos.invoke('live.answer', { runId, requestId, decision }))
  }

  return {
    runs,
    byRunId,
    runForSession,
    countsFor,
    load,
    entriesOf,
    liveStartOf,
    releaseCaughtUpTurns,
    start,
    continueSession,
    send,
    interrupt,
    stop,
    answer,
  }
})
