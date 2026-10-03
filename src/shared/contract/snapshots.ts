import { z } from 'zod'

export const SnapshotSchema = z.object({
  id: z.string(),
  projectPath: z.string(),
  sessionExternalId: z.string(),
  ordinal: z.number().int(),
  kind: z.enum(['baseline', 'turn', 'before_restore']),
  commitHash: z.string(),
  filesChanged: z.number().int(),
  linesAdded: z.number().int(),
  linesRemoved: z.number().int(),
  createdAt: z.string(),
})
export type SnapshotDto = z.infer<typeof SnapshotSchema>

export const SnapshotListSchema = z.object({ available: z.boolean(), snapshots: z.array(SnapshotSchema) })
export type SnapshotListDto = z.infer<typeof SnapshotListSchema>

export const SnapshotsUpdatedSchema = z.object({ sessionExternalId: z.string() })
