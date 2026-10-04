import { z } from 'zod'
import { TurnChangeSchema } from './snapshots'

export const DiffLineSchema = z.object({
  type: z.enum(['context', 'add', 'del']),
  oldNumber: z.number().int().nullable(),
  newNumber: z.number().int().nullable(),
  text: z.string(),
})
export type DiffLineDto = z.infer<typeof DiffLineSchema>

export const DiffHunkSchema = z.object({
  oldStart: z.number().int(),
  newStart: z.number().int(),
  section: z.string(),
  lines: z.array(DiffLineSchema),
})

export const FileDiffSchema = z.object({
  path: z.string(),
  oldPath: z.string().nullable(),
  status: z.enum(['added', 'modified', 'deleted', 'renamed']),
  binary: z.boolean(),
  additions: z.number().int(),
  deletions: z.number().int(),
  hunks: z.array(DiffHunkSchema),
  truncated: z.boolean(),
  /** Fichier de l'agent aussi modifié hors de ses tours. */
  alsoOutside: z.boolean(),
  /** Version du contenu « après » (identifiant git) : c'est elle qui est marquée relue. */
  blob: z.string().nullable(),
  /** Vrai si cette version du fichier a été marquée relue. */
  reviewed: z.boolean(),
})
export type FileDiffDto = z.infer<typeof FileDiffSchema>

export const ReviewRangeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('session') }),
  z.object({ kind: z.literal('since-review') }),
  z.object({ kind: z.literal('turn'), snapshotId: z.string() }),
])
export type ReviewRangeDto = z.infer<typeof ReviewRangeSchema>

export const ReviewDiffSchema = z.object({
  range: ReviewRangeSchema,
  turns: z.array(TurnChangeSchema),
  sinceReviewAvailable: z.boolean(),
  fromId: z.string().nullable(),
  toId: z.string().nullable(),
  files: z.array(FileDiffSchema),
  /** Modifications faites hors des tours de l'agent sur la plage. */
  otherFiles: z.array(FileDiffSchema),
  truncated: z.boolean(),
})
export type ReviewDiffDto = z.infer<typeof ReviewDiffSchema>

export const CommentSideSchema = z.enum(['new', 'old'])

export const ReviewCommentSchema = z.object({
  id: z.string(),
  sessionExternalId: z.string(),
  snapshotId: z.string(),
  filePath: z.string(),
  line: z.number().int(),
  side: CommentSideSchema,
  excerpt: z.string(),
  body: z.string(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
})
export type ReviewCommentDto = z.infer<typeof ReviewCommentSchema>

export const NewReviewCommentSchema = z.object({
  sessionExternalId: z.string(),
  snapshotId: z.string(),
  filePath: z.string().max(4096),
  line: z.number().int().positive(),
  side: CommentSideSchema,
  excerpt: z.string().max(2000),
  body: z.string().min(1).max(5000),
})
export type NewReviewCommentDto = z.infer<typeof NewReviewCommentSchema>
