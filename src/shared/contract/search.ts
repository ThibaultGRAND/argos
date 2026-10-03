import { z } from 'zod'

export const SearchPeriodSchema = z.enum(['all', 'week', 'month', 'year'])
export type SearchPeriodDto = z.infer<typeof SearchPeriodSchema>

export const SearchInputSchema = z.object({
  query: z.string().max(500),
  projectId: z.number().int().optional(),
  period: SearchPeriodSchema.optional(),
})

export const SessionHitSchema = z.object({
  sessionId: z.number().int(),
  title: z.string().nullable(),
  projectName: z.string(),
  lastActivityAt: z.string(),
})
export type SessionHitDto = z.infer<typeof SessionHitSchema>

export const MessageHitSchema = z.object({
  sessionId: z.number().int(),
  sessionTitle: z.string().nullable(),
  projectName: z.string(),
  seq: z.number().int(),
  role: z.enum(['user', 'assistant']),
  /** Extrait dont les passages trouvés sont encadrés par `\u0002` et `\u0003`. */
  snippet: z.string(),
  occurredAt: z.string(),
})
export type MessageHitDto = z.infer<typeof MessageHitSchema>

export const SearchResultsSchema = z.object({
  sessions: z.array(SessionHitSchema),
  messages: z.array(MessageHitSchema),
})
export type SearchResultsDto = z.infer<typeof SearchResultsSchema>

/** Marqueurs de surlignage des extraits (identiques à ceux du domaine). */
export const HIGHLIGHT_START = '\u0002'
export const HIGHLIGHT_END = '\u0003'
