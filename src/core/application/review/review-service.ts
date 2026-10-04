import { DomainError } from '../../domain/errors'
import type { ProviderId } from '../../domain/history/provider'
import type { PreferencesRepository } from '../../domain/ports/preferences-repository'
import type { ReviewCommentRepository } from '../../domain/ports/review-comment-repository'
import type { ShadowRepository } from '../../domain/ports/shadow-repository'
import type { SnapshotRepository } from '../../domain/ports/snapshot-repository'
import type { FileDiff } from '../../domain/review/diff'
import { formatReviewMessage, type CommentSide, type ReviewComment } from '../../domain/review/review-comment'
import { isReviewed } from '../../domain/review/reviewed-file'
import type { ReviewedFileRepository } from '../../domain/ports/reviewed-file-repository'
import {
  checkpointsOf,
  reviewBounds,
  type AttributedFile,
  type ReviewRange,
  type Snapshot,
  type TurnChange,
} from '../../domain/snapshots/snapshot'
import type { ChangeAttribution } from '../snapshots/change-attribution'

export interface ReviewDiff {
  readonly range: ReviewRange
  /** Tours qui ont modifié des fichiers, pour choisir « Un tour ». */
  readonly turns: readonly TurnChange[]
  /** Vrai si « Depuis ma dernière review » a quelque chose à montrer. */
  readonly sinceReviewAvailable: boolean
  readonly from: Snapshot | null
  readonly to: Snapshot | null
  /** Travail de l'agent sur la plage, chaque fichier avec sa marque « relu » (pour sa version actuelle). */
  readonly files: readonly ReviewFile[]
  /** Modifications faites hors des tours de l'agent sur la plage. */
  readonly otherFiles: readonly FileDiff[]
  readonly truncated: boolean
}

export interface ReviewFile extends AttributedFile<FileDiff> {
  readonly reviewed: boolean
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
  readonly attribution: ChangeAttribution
  readonly snapshots: SnapshotRepository
  readonly comments: ReviewCommentRepository
  readonly reviewedFiles: ReviewedFileRepository
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

  /** Changements d'une session : toute la session, depuis la dernière review, ou un tour (refonte du 2026-10-04). */
  async diff(sessionExternalId: string, range: ReviewRange = { kind: 'session' }): Promise<ReviewDiff> {
    const snapshots = this.deps.snapshots.listForSession(PROVIDER, sessionExternalId)
    const { turns } = checkpointsOf(snapshots)
    const sinceReviewAvailable = reviewBounds(snapshots, { kind: 'since-review' }) !== undefined
    const bounds = reviewBounds(snapshots, range)
    if (bounds === undefined) {
      return { range, turns, sinceReviewAvailable, from: null, to: null, files: [], otherFiles: [], truncated: false }
    }
    const { from, to } = bounds
    const { files, truncated } = await this.deps.shadow.diff(to.projectPath, from.commitHash, to.commitHash)
    const { agent, other } = await this.deps.attribution.attribute(files, bounds.turns, bounds.outside)
    const reviewed = this.deps.reviewedFiles.listForSession(PROVIDER, sessionExternalId)
    const withMarks = agent.map((entry) => ({ ...entry, reviewed: isReviewed(entry.file, reviewed) }))
    return { range, turns, sinceReviewAvailable, from, to, files: withMarks, otherFiles: other, truncated }
  }

  /** Marque une version d'un fichier comme relue ; une nouvelle modification de l'agent la rendra à relire. */
  markFileReviewed(sessionExternalId: string, filePath: string, blob: string | null): void {
    this.deps.reviewedFiles.save({
      id: this.deps.newId(),
      providerId: PROVIDER,
      sessionExternalId,
      filePath,
      blob: blob ?? '',
      reviewedAt: this.deps.now().toISOString(),
    })
  }

  unmarkFileReviewed(sessionExternalId: string, filePath: string): void {
    this.deps.reviewedFiles.remove(PROVIDER, sessionExternalId, filePath)
  }

  /** « Marquer comme relu » : la prochaine review « depuis ma dernière review » part de cette capture. */
  markReviewed(snapshotId: string): void {
    if (this.deps.snapshots.get(snapshotId) === undefined) {
      throw new DomainError('snapshot_not_found', 'Capture introuvable', { snapshotId })
    }
    this.deps.snapshots.markReviewed(snapshotId, this.deps.now().toISOString())
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
    const at = this.deps.now().toISOString()
    this.deps.comments.markSent(
      pending.map((comment) => comment.id),
      at,
    )
    // Envoyer ses remarques, c'est avoir relu jusqu'au dernier tour de l'agent.
    const lastTurn = checkpointsOf(this.deps.snapshots.listForSession(PROVIDER, sessionExternalId)).turns.at(-1)
    if (lastTurn !== undefined) this.deps.snapshots.markReviewed(lastTurn.snapshot.id, at)
    return { runId, sent: pending.length }
  }
}
