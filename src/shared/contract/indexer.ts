import { z } from 'zod'

export const ImportProgressSchema = z.object({
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
})

/** État de l'indexeur, exposé à l'interface. */
export const IndexerStatusSchema = z.object({
  state: z.enum(['starting', 'importing', 'ready', 'error']),
  progress: ImportProgressSchema.optional(),
})
export type IndexerStatusDto = z.infer<typeof IndexerStatusSchema>

/** Messages du processus principal vers l'indexeur. */
export const MainToIndexerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('init'), indexDbPath: z.string(), migrationsFolder: z.string() }),
  z.object({ type: z.literal('import') }),
  z.object({ type: z.literal('ping') }),
])
export type MainToIndexerMessage = z.infer<typeof MainToIndexerSchema>

/** Messages de l'indexeur vers le processus principal. */
export const IndexerToMainSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('pong') }),
  z.object({ type: z.literal('progress'), progress: ImportProgressSchema }),
  z.object({
    type: z.literal('imported'),
    filesRead: z.number().int(),
    sessionsChanged: z.number().int(),
    skippedLines: z.number().int(),
    failures: z.number().int(),
  }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
])
export type IndexerToMainMessage = z.infer<typeof IndexerToMainSchema>
