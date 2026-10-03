import { z } from 'zod'
import { SnapshotSchema } from './snapshots'

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
})
export type FileDiffDto = z.infer<typeof FileDiffSchema>

export const ReviewDiffSchema = z.object({
  snapshots: z.array(SnapshotSchema),
  fromId: z.string().nullable(),
  toId: z.string().nullable(),
  files: z.array(FileDiffSchema),
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
