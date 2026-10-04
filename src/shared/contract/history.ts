import { z } from 'zod'

export const ProviderIdSchema = z.enum(['claude', 'codex', 'gemini'])

export const ProjectSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  path: z.string(),
  sessionCount: z.number().int(),
  lastActivityAt: z.string(),
})
export type ProjectSummaryDto = z.infer<typeof ProjectSummarySchema>

export const SessionSummarySchema = z.object({
  id: z.number().int(),
  providerId: ProviderIdSchema,
  externalId: z.string(),
  /** `null` : session sans titre, l'interface affiche le libellé traduit. */
  title: z.string().nullable(),
  excerpt: z.string().nullable(),
  model: z.string().nullable(),
  startedAt: z.string(),
  lastActivityAt: z.string(),
  messageCount: z.number().int(),
  filesChanged: z.number().int(),
  linesAdded: z.number().int(),
  linesRemoved: z.number().int(),
})
export type SessionSummaryDto = z.infer<typeof SessionSummarySchema>

export const ListSessionsInputSchema = z.object({
  projectId: z.number().int(),
  query: z.string().max(200).optional(),
})

export const IndexUpdatedSchema = z.object({ sessionsChanged: z.number().int() })
export type IndexUpdatedDto = z.infer<typeof IndexUpdatedSchema>

export const SessionFileSchema = z.object({
  path: z.string(),
  linesAdded: z.number().int(),
  linesRemoved: z.number().int(),
  changes: z.number().int(),
})
export type SessionFileDto = z.infer<typeof SessionFileSchema>

export const SessionUsageSchema = z.object({
  contextTokens: z.number().int().nullable(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  cacheReadTokens: z.number().int(),
  cacheCreationTokens: z.number().int(),
})
export type SessionUsageDto = z.infer<typeof SessionUsageSchema>

export const SessionDetailSchema = SessionSummarySchema.extend({
  projectId: z.number().int(),
  projectName: z.string(),
  projectPath: z.string(),
  gitBranch: z.string().nullable(),
  cliVersion: z.string().nullable(),
  toolCallCount: z.number().int(),
  files: z.array(SessionFileSchema),
  usage: SessionUsageSchema,
})
export type SessionDetailDto = z.infer<typeof SessionDetailSchema>

export const MessageEntrySchema = z.object({
  kind: z.literal('message'),
  seq: z.number().int(),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  truncated: z.boolean(),
  occurredAt: z.string(),
})

export const ToolEntrySchema = z.object({
  kind: z.literal('tool'),
  seq: z.number().int(),
  toolName: z.string(),
  toolKind: z.string(),
  target: z.string().nullable(),
  summary: z.string().nullable(),
  status: z.enum(['pending', 'success', 'error']),
  linesAdded: z.number().int(),
  linesRemoved: z.number().int(),
  occurredAt: z.string(),
})

export const TimelineEntrySchema = z.discriminatedUnion('kind', [MessageEntrySchema, ToolEntrySchema])
export type TimelineEntryDto = z.infer<typeof TimelineEntrySchema>
export type MessageEntryDto = z.infer<typeof MessageEntrySchema>
export type ToolEntryDto = z.infer<typeof ToolEntrySchema>

export const TimelinePageSchema = z.object({
  entries: z.array(TimelineEntrySchema),
  nextSeq: z.number().int().nullable(),
})
export type TimelinePageDto = z.infer<typeof TimelinePageSchema>

export const SessionIdInputSchema = z.object({ sessionId: z.number().int() })

export const ListEntriesInputSchema = z.object({
  sessionId: z.number().int(),
  afterSeq: z.number().int().optional(),
  limit: z.number().int().min(1).max(500).optional(),
})
