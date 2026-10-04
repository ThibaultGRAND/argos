import type { ToolCall, ToolResult } from '../history/events'

/**
 * Événements d'une session pilotée en direct (F05, PLAN.md §2.2).
 * Ils servent à l'affichage en direct et aux permissions ; l'historique reste importé depuis les fichiers de la CLI.
 */
export type LiveStatus = 'starting' | 'running' | 'waiting' | 'idle' | 'ended' | 'error'

export type PermissionDecision = 'allow' | 'allow-session' | 'deny'

export interface PermissionRequest {
  readonly requestId: string
  readonly toolName: string
  /** Phrase prête à afficher fournie par la CLI (« Claude veut modifier … »), si disponible. */
  readonly title: string | null
  readonly target: string | null
}

export interface ModelContextWindow {
  readonly model: string
  readonly contextWindow: number
}

export type LiveEvent =
  | { readonly type: 'status'; readonly status: LiveStatus; readonly message?: string }
  | { readonly type: 'identified'; readonly sessionExternalId: string; readonly model: string | null }
  | { readonly type: 'user-message'; readonly text: string; readonly occurredAt: string }
  /** Morceau de texte de l'agent en cours d'écriture, rattaché à un message. */
  | { readonly type: 'assistant-delta'; readonly messageId: string; readonly text: string }
  /** Texte complet d'un message de l'agent : remplace ses morceaux. */
  | { readonly type: 'assistant-text'; readonly messageId: string; readonly text: string; readonly occurredAt: string }
  | ToolCall
  | ToolResult
  | { readonly type: 'permission-requested'; readonly request: PermissionRequest }
  | { readonly type: 'permission-resolved'; readonly requestId: string }
  | { readonly type: 'turn-completed'; readonly isError: boolean; readonly durationMs: number }
  /** Contexte occupé après un appel de l'agent (F08). */
  | { readonly type: 'usage'; readonly model: string | null; readonly contextTokens: number }
  /** Taille exacte de la fenêtre de contexte de chaque modèle utilisé pendant le tour (F08). */
  | { readonly type: 'context-windows'; readonly windows: readonly ModelContextWindow[] }

/** Statut d'une session après un événement ; `undefined` si l'événement ne le change pas. */
export function statusAfter(current: LiveStatus, event: LiveEvent): LiveStatus | undefined {
  switch (event.type) {
    case 'status':
      return event.status
    case 'permission-requested':
      return 'waiting'
    case 'permission-resolved':
      return current === 'waiting' ? 'running' : undefined
    case 'turn-completed':
      return event.isError ? 'error' : 'idle'
    case 'user-message':
      return current === 'ended' ? undefined : 'running'
    default:
      return undefined
  }
}
