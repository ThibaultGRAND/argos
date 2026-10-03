import { z } from 'zod'

/** État de l'indexeur, exposé à l'interface. */
export const IndexerStatusSchema = z.object({
  state: z.enum(['starting', 'ready', 'error']),
})
export type IndexerStatusDto = z.infer<typeof IndexerStatusSchema>

/** Messages du processus principal vers l'indexeur. */
export const MainToIndexerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('init'), indexDbPath: z.string() }),
  z.object({ type: z.literal('ping') }),
])
export type MainToIndexerMessage = z.infer<typeof MainToIndexerSchema>

/** Messages de l'indexeur vers le processus principal. */
export const IndexerToMainSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('pong') }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
])
export type IndexerToMainMessage = z.infer<typeof IndexerToMainSchema>
