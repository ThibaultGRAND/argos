import type { TokenUsage } from '../usage/usage'
import type { ToolKind } from './tool-kind'

/**
 * Événements normalisés produits par un `HistorySource` (PLAN.md §2.2).
 * Toutes les dates sont des chaînes ISO 8601 UTC.
 */
export interface SessionObserved {
  readonly type: 'session-observed'
  readonly projectPath: string
  readonly occurredAt: string
  readonly cliVersion?: string
  readonly gitBranch?: string
}

export interface TitleChanged {
  readonly type: 'title-changed'
  /** `custom` : donné par l'utilisateur ; `generated` : produit automatiquement par la CLI. */
  readonly source: 'custom' | 'generated'
  readonly title: string
}

export interface UserMessage {
  readonly type: 'user-message'
  readonly externalId: string
  readonly text: string
  readonly occurredAt: string
}

export interface AssistantMessage {
  readonly type: 'assistant-message'
  readonly externalId: string
  readonly text: string
  readonly model?: string
  readonly occurredAt: string
}

export interface ToolCall {
  readonly type: 'tool-call'
  readonly externalId: string
  readonly toolName: string
  readonly kind: ToolKind
  readonly target?: string
  readonly summary?: string
  readonly model?: string
  readonly occurredAt: string
}

export interface FileChange {
  readonly path: string
  readonly linesAdded: number
  readonly linesRemoved: number
}

export interface ToolResult {
  readonly type: 'tool-result'
  readonly toolCallExternalId: string
  readonly status: 'success' | 'error'
  readonly fileChanges: readonly FileChange[]
  readonly occurredAt: string
}

/**
 * Consommation d'un appel au modèle (F08). Une même réponse peut être écrite sur plusieurs lignes :
 * `messageId` permet de ne la compter qu'une fois.
 */
export interface UsageReported extends TokenUsage {
  readonly type: 'usage-reported'
  readonly messageId: string
  /** Vrai pour un appel d'un sous-agent : compté dans les totaux, pas dans le contexte de la session. */
  readonly sidechain: boolean
  readonly occurredAt: string
}

export type HistoryEvent =
  SessionObserved | TitleChanged | UserMessage | AssistantMessage | ToolCall | ToolResult | UsageReported
