import { DomainError } from '../../domain/errors'
import type { ProviderId } from '../../domain/history/provider'
import type { PreferencesRepository } from '../../domain/ports/preferences-repository'
import type { ReviewCommentRepository } from '../../domain/ports/review-comment-repository'
import type { ShadowRepository } from '../../domain/ports/shadow-repository'
import type { SnapshotRepository } from '../../domain/ports/snapshot-repository'
import type { FileDiff } from '../../domain/review/diff'
import { formatReviewMessage, type CommentSide, type ReviewComment } from '../../domain/review/review-comment'
import type { Snapshot } from '../../domain/snapshots/snapshot'

export interface ReviewDiff {
  readonly snapshots: readonly Snapshot[]
  readonly from: Snapshot | null
  readonly to: Snapshot | null
  readonly files: readonly FileDiff[]
  readonly truncated: boolean
}

export interface NewComment {
  readonly sessionExternalId: string
  readonly snapshotId: string
  readonly filePath: string
  readonly line: number
  readonly side: CommentSide
  readonly excerpt: string
  readonly body: string
}

/** Envoi d'un message à une session (reprise si besoin), fourni par les commandes des sessions en direct. */
export type SendToSession = (sessionId: number, text: string) => Promise<string>

export interface ReviewServiceDependencies {
  readonly shadow: ShadowRepository
  readonly snapshots: SnapshotRepository
  readonly comments: ReviewCommentRepository
  readonly preferences: PreferencesRepository
  readonly sendToSession: SendToSession
  readonly newId: () => string
  readonly now: () => Date
}

const PROVIDER: ProviderId = 'claude'
const MAX_COMMENT_LENGTH = 5_000

/** Review façon PR des changements d'une session, entre deux snapshots (F07). */
export class ReviewService {
  constructor(private readonly deps: ReviewServiceDependencies) {}

  /**
   * Diff entre deux snapshots ; par défaut du premier (S0) au dernier snapshot de fin de tour
   * (un « avant retour » n'est pas un travail de l'agent à relire).
   */
  async diff(sessionExternalId: string, fromId?: string, toId?: string): Promise<ReviewDiff> {
    const snapshots = this.deps.snapshots.listForSession(PROVIDER, sessionExternalId)
    const pick = (id: string | undefined, fallback: Snapshot | undefined): Snapshot | undefined =>
      id === undefined ? fallback : snapshots.find((snapshot) => snapshot.id === id)
    const from = pick(fromId, snapshots[0])
    const lastTurn = [...snapshots].reverse().find((snapshot) => snapshot.kind === 'turn')
    const to = pick(toId, lastTurn ?? snapshots.at(-1))
    if (from === undefined || to === undefined || from.id === to.id) {
      return { snapshots, from: from ?? null, to: to ?? null, files: [], truncated: false }
    }
    const { files, truncated } = await this.deps.shadow.diff(to.projectPath, from.commitHash, to.commitHash)
    return { snapshots, from, to, files, truncated }
  }

  listComments(sessionExternalId: string): readonly ReviewComment[] {
    return this.deps.comments.listForSession(PROVIDER, sessionExternalId)
  }

  addComment(input: NewComment): ReviewComment {
    const body = input.body.trim()
    if (body === '' || body.length > MAX_COMMENT_LENGTH)
      throw new DomainError('invalid_comment', 'Commentaire vide ou trop long')
    const comment: ReviewComment = {
      id: this.deps.newId(),
      providerId: PROVIDER,
      sessionExternalId: input.sessionExternalId,
      snapshotId: input.snapshotId,
      filePath: input.filePath,
      line: input.line,
      side: input.side,
      excerpt: input.excerpt.slice(0, 500),
      body,
      sentAt: null,
      createdAt: this.deps.now().toISOString(),
    }
    this.deps.comments.save(comment)
    return comment
  }

  deleteComment(id: string): void {
    this.deps.comments.delete(id)
  }

  /** Envoie les commentaires pas encore envoyés à l'agent, puis les marque comme envoyés. */
  async send(sessionId: number, sessionExternalId: string): Promise<{ runId: string; sent: number }> {
    const pending = this.listComments(sessionExternalId).filter((comment) => comment.sentAt === null)
    if (pending.length === 0) throw new DomainError('no_comment_to_send', 'Aucun commentaire à envoyer')
    const { language } = await this.deps.preferences.load()
    const runId = await this.deps.sendToSession(sessionId, formatReviewMessage(pending, language))
    this.deps.comments.markSent(
      pending.map((comment) => comment.id),
      this.deps.now().toISOString(),
    )
    return { runId, sent: pending.length }
  }
}
