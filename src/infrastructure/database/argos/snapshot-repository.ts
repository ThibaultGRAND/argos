import { and, asc, eq } from 'drizzle-orm'
import { providerIds, type ProviderId } from '../../../core/domain/history/provider'
import type { SnapshotRepository } from '../../../core/domain/ports/snapshot-repository'
import type { Snapshot, SnapshotKind } from '../../../core/domain/snapshots/snapshot'
import type { ArgosDatabase } from './argos-database'
import { snapshots } from './schema'

type Row = typeof snapshots.$inferSelect

const kinds: readonly SnapshotKind[] = ['baseline', 'prompt', 'turn', 'before_restore']

function toSnapshot(row: Row): Snapshot | undefined {
  const providerId = providerIds.find((id) => id === row.providerId)
  const kind = kinds.find((value) => value === row.kind)
  if (providerId === undefined || kind === undefined) return undefined
  return {
    id: row.id,
    projectPath: row.projectPath,
    providerId,
    sessionExternalId: row.sessionExternalId,
    ordinal: row.ordinal,
    kind,
    commitHash: row.commitHash,
    parentCommitHash: row.parentCommitHash,
    filesChanged: row.filesChanged,
    linesAdded: row.linesAdded,
    linesRemoved: row.linesRemoved,
    label: row.label,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
  }
}

export class SqliteSnapshotRepository implements SnapshotRepository {
  constructor(private readonly database: ArgosDatabase) {}

  save(snapshot: Snapshot): void {
    this.database
      .insert(snapshots)
      .values({ ...snapshot, updatedAt: snapshot.createdAt })
      .run()
  }

  listForSession(providerId: ProviderId, sessionExternalId: string): readonly Snapshot[] {
    return this.database
      .select()
      .from(snapshots)
      .where(and(eq(snapshots.providerId, providerId), eq(snapshots.sessionExternalId, sessionExternalId)))
      .orderBy(asc(snapshots.ordinal))
      .all()
      .flatMap((row) => toSnapshot(row) ?? [])
  }

  markReviewed(id: string, at: string): void {
    this.database.update(snapshots).set({ reviewedAt: at, updatedAt: at }).where(eq(snapshots.id, id)).run()
  }

  get(id: string): Snapshot | undefined {
    const row = this.database.select().from(snapshots).where(eq(snapshots.id, id)).get()
    return row === undefined ? undefined : toSnapshot(row)
  }
}
