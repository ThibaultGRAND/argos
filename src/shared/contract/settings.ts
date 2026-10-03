import { z } from 'zod'
import { ProviderIdSchema } from './history'

export const SourceInfoSchema = z.object({
  providerId: ProviderIdSchema,
  status: z.enum(['available', 'missing', 'planned']),
  directory: z.string().nullable(),
  sessionCount: z.number().int(),
})
export type SourceInfoDto = z.infer<typeof SourceInfoSchema>

export const EnvironmentSchema = z.object({
  dataDirectory: z.string(),
  sources: z.array(SourceInfoSchema),
})
export type EnvironmentDto = z.infer<typeof EnvironmentSchema>

export const OpenInEditorInputSchema = z.object({
  path: z.string().min(1).max(4096),
  line: z.number().int().positive().optional(),
})
