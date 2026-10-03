import type { z } from 'zod'
import type { EventName } from './channels'
import { IndexUpdatedSchema } from './history'
import { IndexerStatusSchema } from './indexer'

/** Événements du processus principal vers l'interface. `satisfies` garantit la correspondance avec channels.ts. */
export const events = {
  'indexer.status': IndexerStatusSchema,
  'index.updated': IndexUpdatedSchema,
} as const satisfies Record<EventName, z.ZodType>

export type Events = typeof events
export type EventPayload<E extends EventName> = z.output<Events[E]>
