import { z } from 'zod'

export const ThemeSchema = z.enum(['dark', 'light', 'system'])
export const LanguageSchema = z.enum(['fr', 'en'])

export const PreferencesSchema = z.object({
  theme: ThemeSchema,
  language: LanguageSchema,
})
export type PreferencesDto = z.infer<typeof PreferencesSchema>

export const PreferencesUpdateSchema = PreferencesSchema.partial()
export type PreferencesUpdateDto = z.infer<typeof PreferencesUpdateSchema>
