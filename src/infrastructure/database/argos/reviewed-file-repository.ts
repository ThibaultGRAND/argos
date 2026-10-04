import { and, eq } from 'drizzle-orm'
import { providerIds, type ProviderId } from '../../../core/domain/history/provider'
import type { ReviewedFileRepository } from '../../../core/domain/ports/reviewed-file-repository'
import type { ReviewedFile } from '../../../core/domain/review/reviewed-file'
import type { ArgosDatabase } from './argos-database'
import { reviewedFiles } from './schema'

export class SqliteReviewedFileRepository implements ReviewedFileRepository {
  constructor(private readonly database: ArgosDatabase) {}

  listForSession(providerId: ProviderId, sessionExternalId: string): readonly ReviewedFile[] {
    return this.database
      .select()
      .from(reviewedFiles)
      .where(and(eq(reviewedFiles.providerId, providerId), eq(reviewedFiles.sessionExternalId, sessionExternalId)))
      .all()
      .flatMap((row) => {
        const provider = providerIds.find((id) => id === row.providerId)
        return provider === undefined
          ? []
          : [
              {
                id: row.id,
                providerId: provider,
                sessionExternalId: row.sessionExternalId,
                filePath: row.filePath,
                blob: row.blob,
                reviewedAt: row.updatedAt,
              },
            ]
      })
  }

  save(file: ReviewedFile): void {
    this.database
      .insert(reviewedFiles)
      .values({
        id: file.id,
        providerId: file.providerId,
        sessionExternalId: file.sessionExternalId,
        filePath: file.filePath,
        blob: file.blob,
        createdAt: file.reviewedAt,
        updatedAt: file.reviewedAt,
      })
      .onConflictDoUpdate({
        target: [reviewedFiles.providerId, reviewedFiles.sessionExternalId, reviewedFiles.filePath],
        set: { blob: file.blob, updatedAt: file.reviewedAt },
      })
      .run()
  }

  remove(providerId: ProviderId, sessionExternalId: string, filePath: string): void {
    this.database
      .delete(reviewedFiles)
      .where(
        and(
          eq(reviewedFiles.providerId, providerId),
          eq(reviewedFiles.sessionExternalId, sessionExternalId),
          eq(reviewedFiles.filePath, filePath),
        ),
      )
      .run()
  }
}
