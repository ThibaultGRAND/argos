import { z } from 'zod'
import { AppInfoSchema } from './app'
import type { RequestName } from './channels'
import { IndexerStatusSchema } from './indexer'
import { PreferencesSchema, PreferencesUpdateSchema } from './preferences'

interface RequestDefinition {
  readonly input: z.ZodType
  readonly output: z.ZodType
}

/**
 * Requêtes de l'interface vers le processus principal, déclarées une seule fois.
 * Nommage : `<domaine>.<action>` (PLAN.md §2.3). `satisfies` garantit la correspondance exacte avec channels.ts.
 */
export const requests = {
  'app.info': { input: z.undefined(), output: AppInfoSchema },
  'preferences.get': { input: z.undefined(), output: PreferencesSchema },
  'preferences.update': { input: PreferencesUpdateSchema, output: PreferencesSchema },
  'indexer.status': { input: z.undefined(), output: IndexerStatusSchema },
} as const satisfies Record<RequestName, RequestDefinition>

export type Requests = typeof requests
export type RequestInput<N extends RequestName> = z.input<Requests[N]['input']>
export type RequestOutput<N extends RequestName> = z.output<Requests[N]['output']>
