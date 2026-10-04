import { z } from 'zod'

export const LiveStatusSchema = z.enum(['starting', 'running', 'waiting', 'idle', 'ended', 'error'])
export type LiveStatusDto = z.infer<typeof LiveStatusSchema>

export const ModelChoiceSchema = z.enum(['opus', 'sonnet', 'haiku'])
export type ModelChoiceDto = z.infer<typeof ModelChoiceSchema>

export const PermissionRequestSchema = z.object({
  requestId: z.string(),
  toolName: z.string(),
  title: z.string().nullable(),
  target: z.string().nullable(),
})
export type PermissionRequestDto = z.infer<typeof PermissionRequestSchema>

const FileChangeSchema = z.object({ path: z.string(), linesAdded: z.number().int(), linesRemoved: z.number().int() })

export const LiveEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('status'), status: LiveStatusSchema, message: z.string().optional() }),
  z.object({ type: z.literal('identified'), sessionExternalId: z.string(), model: z.string().nullable() }),
  z.object({ type: z.literal('user-message'), text: z.string(), occurredAt: z.string() }),
  z.object({ type: z.literal('assistant-delta'), messageId: z.string(), text: z.string() }),
  z.object({ type: z.literal('assistant-text'), messageId: z.string(), text: z.string(), occurredAt: z.string() }),
  z.object({
    type: z.literal('tool-call'),
    externalId: z.string(),
    toolName: z.string(),
    kind: z.string(),
    target: z.string().optional(),
    summary: z.string().optional(),
    model: z.string().optional(),
    occurredAt: z.string(),
  }),
  z.object({
    type: z.literal('tool-result'),
    toolCallExternalId: z.string(),
    status: z.enum(['success', 'error']),
    fileChanges: z.array(FileChangeSchema),
    occurredAt: z.string(),
  }),
  z.object({ type: z.literal('permission-requested'), request: PermissionRequestSchema }),
  z.object({ type: z.literal('permission-resolved'), requestId: z.string() }),
  z.object({ type: z.literal('turn-completed'), isError: z.boolean(), durationMs: z.number() }),
  z.object({ type: z.literal('usage'), model: z.string().nullable(), contextTokens: z.number().int() }),
  z.object({
    type: z.literal('context-windows'),
    windows: z.array(z.object({ model: z.string(), contextWindow: z.number().int() })),
  }),
])
export type LiveEventDto = z.infer<typeof LiveEventSchema>

export const LiveEventEnvelopeSchema = z.object({ runId: z.string(), event: LiveEventSchema })
export type LiveEventEnvelopeDto = z.infer<typeof LiveEventEnvelopeSchema>

export const RunSummarySchema = z.object({
  runId: z.string(),
  projectPath: z.string(),
  sessionExternalId: z.string().nullable(),
  status: LiveStatusSchema,
  pendingPermissions: z.array(PermissionRequestSchema),
})
export type RunSummaryDto = z.infer<typeof RunSummarySchema>

const MessageText = z.string().min(1).max(100_000)

export const LiveStartInputSchema = z.object({
  projectId: z.number().int(),
  text: MessageText,
  model: ModelChoiceSchema.optional(),
})
export const LiveContinueInputSchema = z.object({
  sessionId: z.number().int(),
  text: MessageText,
  model: ModelChoiceSchema.optional(),
})
export const LiveSendInputSchema = z.object({ runId: z.string(), text: MessageText })
export const RunIdInputSchema = z.object({ runId: z.string() })
export const LiveAnswerInputSchema = z.object({
  runId: z.string(),
  requestId: z.string(),
  decision: z.enum(['allow', 'allow-session', 'deny']),
})
export const RunIdOutputSchema = z.object({ runId: z.string() })
