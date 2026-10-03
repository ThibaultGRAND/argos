import type { ProviderId } from '../history/provider'
import type { Snapshot } from '../snapshots/snapshot'

/** Snapshots enregistrés dans argos.db (données propres à Argos). */
export interface SnapshotRepository {
  save(snapshot: Snapshot): void
  listForSession(providerId: ProviderId, sessionExternalId: string): readonly Snapshot[]
  get(id: string): Snapshot | undefined
}
