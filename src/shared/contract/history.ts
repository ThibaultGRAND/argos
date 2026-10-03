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
