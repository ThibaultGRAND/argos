import { z } from 'zod'

export const AppInfoSchema = z.object({
  version: z.string(),
  platform: z.enum(['darwin', 'win32', 'linux']),
})
export type AppInfoDto = z.infer<typeof AppInfoSchema>
