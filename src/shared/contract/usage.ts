import { z } from 'zod'

export const QuotaWindowSchema = z.object({
  kind: z.enum(['session', 'weekly', 'weekly-model']),
  label: z.string().nullable(),
  utilization: z.number(),
  resetsAt: z.string().nullable(),
  /** Calculé par le domaine : à partir de 80 %, la fenêtre est mise en avant. */
  warning: z.boolean(),
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
  warning: z.boolean(),
})
export type ContextGaugeDto = z.infer<typeof ContextGaugeSchema>
