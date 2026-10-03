import { and, asc, eq, inArray } from 'drizzle-orm'
import { providerIds, type ProviderId } from '../../../core/domain/history/provider'
import type { ReviewCommentRepository } from '../../../core/domain/ports/review-comment-repository'
import type { ReviewComment } from '../../../core/domain/review/review-comment'
import type { ArgosDatabase } from './argos-database'
import { reviewComments } from './schema'

type Row = typeof reviewComments.$inferSelect

function toComment(row: Row): ReviewComment | undefined {
  const providerId = providerIds.find((id) => id === row.providerId)
  if (providerId === undefined) return undefined
  return {
    id: row.id,
    providerId,
    sessionExternalId: row.sessionExternalId,
    snapshotId: row.snapshotId,
    filePath: row.filePath,
    line: row.line,
    side: row.side === 'old' ? 'old' : 'new',
    excerpt: row.excerpt,
    body: row.body,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  }
}

export class SqliteReviewCommentRepository implements ReviewCommentRepository {
  constructor(private readonly database: ArgosDatabase) {}

  save(comment: ReviewComment): void {
    this.database
      .insert(reviewComments)
      .values({ ...comment, updatedAt: comment.createdAt })
      .run()
  }

  listForSession(providerId: ProviderId, sessionExternalId: string): readonly ReviewComment[] {
    return this.database
      .select()
      .from(reviewComments)
      .where(and(eq(reviewComments.providerId, providerId), eq(reviewComments.sessionExternalId, sessionExternalId)))
      .orderBy(asc(reviewComments.createdAt))
      .all()
      .flatMap((row) => toComment(row) ?? [])
  }

  delete(id: string): void {
    this.database.delete(reviewComments).where(eq(reviewComments.id, id)).run()
  }

  markSent(ids: readonly string[], sentAt: string): void {
    if (ids.length === 0) return
    this.database
      .update(reviewComments)
      .set({ sentAt, updatedAt: sentAt })
      .where(inArray(reviewComments.id, [...ids]))
      .run()
  }
}
