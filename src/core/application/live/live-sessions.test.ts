import { describe, expect, it } from 'vitest'
import type { LiveEvent, PermissionDecision } from '../../domain/live/live-events'
import type { AgentRuntime, LiveRun, LiveRunOptions } from '../../domain/ports/agent-runtime'
import { LiveSessions } from './live-sessions'

class FakeRun implements LiveRun {
  readonly sent: string[] = []
  readonly answers: [string, PermissionDecision][] = []
  stopped = false
  interrupted = false
  constructor(readonly emit: (event: LiveEvent) => void) {}
  send(text: string): void {
    this.sent.push(text)
  }
  async interrupt(): Promise<void> {
    this.interrupted = true
  }
  stop(): void {
    this.stopped = true
  }
  contextBreakdown = async () => null
  answerPermission(requestId: string, decision: PermissionDecision): void {
    this.answers.push([requestId, decision])
  }
}

function setup() {
  const runs: { options: LiveRunOptions; run: FakeRun }[] = []
  const events: [string, LiveEvent['type']][] = []
  const turns: string[] = []
  const runtime: AgentRuntime = {
    start: (options, onEvent) => {
      const run = new FakeRun(onEvent)
      runs.push({ options, run })
      return run
    },
  }
  let next = 0
  const sessions = new LiveSessions(
    runtime,
    { onEvent: (runId, event) => events.push([runId, event.type]), onTurnCompleted: (runId) => turns.push(runId) },
    () => `run-${++next}`,
  )
  return { sessions, runs, events, turns }
}

describe('LiveSessions', () => {
  it('démarre une session, envoie le premier message et suit son statut', () => {
    const { sessions, runs } = setup()
    const runId = sessions.start('/p', 'Bonjour', 'opus')
    expect(runs[0]?.options).toEqual({ cwd: '/p', model: 'opus' })
    expect(runs[0]?.run.sent).toEqual(['Bonjour'])
    expect(sessions.list()[0]).toMatchObject({ runId, status: 'running', sessionExternalId: null })

    runs[0]?.run.emit({ type: 'identified', sessionExternalId: 's-1', model: 'claude-opus-5-5' })
    runs[0]?.run.emit({ type: 'turn-completed', isError: false, durationMs: 10 })
    expect(sessions.list()[0]).toMatchObject({ status: 'idle', sessionExternalId: 's-1' })
  })

  it('reprend une session existante, ou réutilise celle qu’Argos pilote déjà', () => {
    const { sessions, runs } = setup()
    const first = sessions.continue('s-9', '/p', 'Suite')
    expect(runs[0]?.options).toEqual({ cwd: '/p', resumeExternalId: 's-9' })
    const second = sessions.continue('s-9', '/p', 'Encore')
    expect(second).toBe(first)
    expect(runs).toHaveLength(1)
    expect(runs[0]?.run.sent).toEqual(['Suite', 'Encore'])
  })

  it('met la session en attente pendant une demande de permission, puis transmet la réponse', () => {
    const { sessions, runs } = setup()
    const runId = sessions.start('/p', 'Go')
    runs[0]?.run.emit({
      type: 'permission-requested',
      request: { requestId: 'r1', toolName: 'Edit', title: null, target: 'a.ts' },
    })
    expect(sessions.list()[0]).toMatchObject({ status: 'waiting', pendingPermissions: [{ requestId: 'r1' }] })

    sessions.answer(runId, 'r1', 'allow-session')
    expect(runs[0]?.run.answers).toEqual([['r1', 'allow-session']])
    expect(sessions.list()[0]).toMatchObject({ status: 'running', pendingPermissions: [] })
    expect(() => sessions.answer(runId, 'r1', 'allow')).toThrow()
  })

  it('signale la fin d’un tour, interrompt et arrête', async () => {
    const { sessions, runs, turns } = setup()
    const runId = sessions.start('/p', 'Go')
    runs[0]?.run.emit({ type: 'turn-completed', isError: false, durationMs: 5 })
    expect(turns).toEqual([runId])

    await sessions.interrupt(runId)
    expect(runs[0]?.run.interrupted).toBe(true)
    sessions.stop(runId)
    expect(runs[0]?.run.stopped).toBe(true)
    expect(sessions.list()[0]?.status).toBe('ended')
    expect(() => sessions.send(runId, 'encore')).toThrow()
  })

  it('refuse une session inconnue', () => {
    const { sessions } = setup()
    expect(() => sessions.send('inconnue', 'x')).toThrow(/introuvable/)
  })
})
