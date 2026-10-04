import { z } from 'zod'

/** État des mises à jour de l'app installée (F09). */
export const UpdateStateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('unsupported') }),
  z.object({ kind: z.literal('idle') }),
  z.object({ kind: z.literal('checking') }),
  z.object({ kind: z.literal('up-to-date'), checkedAt: z.string() }),
  z.object({ kind: z.literal('available'), version: z.string(), mode: z.enum(['automatic', 'manual']) }),
  z.object({ kind: z.literal('downloading'), version: z.string(), percent: z.number() }),
  z.object({ kind: z.literal('ready'), version: z.string() }),
  z.object({ kind: z.literal('error'), message: z.string(), checkedAt: z.string() }),
])
export type UpdateStateDto = z.infer<typeof UpdateStateSchema>
