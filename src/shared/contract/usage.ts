import { z } from 'zod'

/** Calculé par le domaine : vigilance à partir de 50 %, alerte à partir de 80 %. */
export const GaugeLevelSchema = z.enum(['normal', 'caution', 'warning'])
export type GaugeLevelDto = z.infer<typeof GaugeLevelSchema>

export const QuotaWindowSchema = z.object({
  kind: z.enum(['session', 'weekly', 'weekly-model']),
  label: z.string().nullable(),
  utilization: z.number(),
  resetsAt: z.string().nullable(),
  level: GaugeLevelSchema,
})
export type QuotaWindowDto = z.infer<typeof QuotaWindowSchema>

export const PlanQuotaSchema = z.object({ windows: z.array(QuotaWindowSchema), fetchedAt: z.string() })
export type PlanQuotaDto = z.infer<typeof PlanQuotaSchema>

export const QuotaOutputSchema = z.object({ quota: PlanQuotaSchema.nullable() })
export const ContextGaugeInputSchema = z.object({
  model: z.string().min(1).max(200).nullable(),
  tokens: z.number().int().min(0),
})
export const ContextGaugeSchema = z.object({
  tokens: z.number().int(),
  /** `null` : taille de la fenêtre inconnue, seule la quantité est affichée. */
  window: z.number().int().nullable(),
  percent: z.number().int().nullable(),
  level: GaugeLevelSchema,
  autoCompactAt: z.number().int().nullable(),
})
export type ContextGaugeDto = z.infer<typeof ContextGaugeSchema>

export const ContextCategorySchema = z.object({
  id: z.enum([
    'system-prompt',
    'system-tools',
    'mcp-tools',
    'mcp-instructions',
    'agents',
    'memory',
    'skills',
    'messages',
    'buffer',
    'free',
    'other',
  ]),
  label: z.string(),
  tokens: z.number().int(),
})
export type ContextCategoryDto = z.infer<typeof ContextCategorySchema>

export const ContextBreakdownSchema = z.object({
  model: z.string(),
  totalTokens: z.number().int(),
  window: z.number().int(),
  autoCompactAt: z.number().int().nullable(),
  categories: z.array(ContextCategorySchema),
  memoryFiles: z.array(z.object({ path: z.string(), tokens: z.number().int() })),
})
export type ContextBreakdownDto = z.infer<typeof ContextBreakdownSchema>

export const ContextDetailOutputSchema = z.object({ breakdown: ContextBreakdownSchema.nullable() })
