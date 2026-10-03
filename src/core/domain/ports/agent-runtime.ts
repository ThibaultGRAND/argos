import type { LiveEvent, PermissionDecision } from '../live/live-events'

export interface LiveRunOptions {
  /** Dossier du projet dans lequel l'agent travaille. */
  readonly cwd: string
  readonly model?: string
  /** Identifiant de la session à reprendre ; absent pour une nouvelle session. */
  readonly resumeExternalId?: string
}

/** Une session en cours d'exécution, pilotée par Argos. */
export interface LiveRun {
  send(text: string): void
  interrupt(): Promise<void>
  stop(): void
  answerPermission(requestId: string, decision: PermissionDecision): void
}

/** Pilotage d'un agent en direct (PLAN.md §2.2). */
export interface AgentRuntime {
  start(options: LiveRunOptions, onEvent: (event: LiveEvent) => void): LiveRun
}
