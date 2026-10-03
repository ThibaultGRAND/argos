import type { ProviderId } from '../history/provider'
import type { ReviewComment } from '../review/review-comment'

/** Commentaires de review enregistrés dans argos.db (données propres à Argos). */
export interface ReviewCommentRepository {
  save(comment: ReviewComment): void
  listForSession(providerId: ProviderId, sessionExternalId: string): readonly ReviewComment[]
  delete(id: string): void
  markSent(ids: readonly string[], sentAt: string): void
}
