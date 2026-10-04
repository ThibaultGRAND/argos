import { z } from 'zod'
import { AppInfoSchema } from './app'
import type { RequestName } from './channels'
import {
  ListEntriesInputSchema,
  ListSessionsInputSchema,
  ProjectSummarySchema,
  SessionDetailSchema,
  SessionIdInputSchema,
  SessionSummarySchema,
  TimelinePageSchema,
} from './history'
import { IndexerStatusSchema } from './indexer'
import { PreferencesSchema, PreferencesUpdateSchema } from './preferences'
import { SearchInputSchema, SearchResultsSchema } from './search'
import { EnvironmentSchema, OpenInEditorInputSchema } from './settings'
import {
  LiveAnswerInputSchema,
  LiveContinueInputSchema,
  LiveSendInputSchema,
  LiveStartInputSchema,
  RunIdInputSchema,
  RunIdOutputSchema,
  RunSummarySchema,
} from './live'
import { SnapshotListSchema, SnapshotSchema } from './snapshots'
import { NewReviewCommentSchema, ReviewCommentSchema, ReviewDiffSchema } from './review'
import { ContextDetailOutputSchema, ContextGaugeInputSchema, ContextGaugeSchema, QuotaOutputSchema } from './usage'

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
  'projects.list': { input: z.undefined(), output: z.array(ProjectSummarySchema) },
  'sessions.list': { input: ListSessionsInputSchema, output: z.array(SessionSummarySchema) },
  'sessions.get': { input: SessionIdInputSchema, output: SessionDetailSchema },
  'sessions.entries': { input: ListEntriesInputSchema, output: TimelinePageSchema },
  'editor.open': { input: OpenInEditorInputSchema, output: z.undefined() },
  'settings.environment': { input: z.undefined(), output: EnvironmentSchema },
  'index.rebuild': { input: z.undefined(), output: z.undefined() },
  'live.start': { input: LiveStartInputSchema, output: RunIdOutputSchema },
  'live.continue': { input: LiveContinueInputSchema, output: RunIdOutputSchema },
  'live.send': { input: LiveSendInputSchema, output: z.undefined() },
  'live.interrupt': { input: RunIdInputSchema, output: z.undefined() },
  'live.stop': { input: RunIdInputSchema, output: z.undefined() },
  'live.answer': { input: LiveAnswerInputSchema, output: z.undefined() },
  'live.list': { input: z.undefined(), output: z.array(RunSummarySchema) },
  'sessions.findByExternal': {
    input: z.object({ externalId: z.string() }),
    output: z.object({ sessionId: z.number().int().nullable() }),
  },
  'snapshots.list': { input: z.object({ sessionExternalId: z.string() }), output: SnapshotListSchema },
  'snapshots.restore': { input: z.object({ snapshotId: z.string() }), output: SnapshotSchema },
  'review.diff': {
    input: z.object({ sessionExternalId: z.string(), fromId: z.string().optional(), toId: z.string().optional() }),
    output: ReviewDiffSchema,
  },
  'review.comments.list': { input: z.object({ sessionExternalId: z.string() }), output: z.array(ReviewCommentSchema) },
  'review.comments.add': { input: NewReviewCommentSchema, output: ReviewCommentSchema },
  'review.comments.delete': { input: z.object({ id: z.string() }), output: z.undefined() },
  'review.send': {
    input: z.object({ sessionId: z.number().int(), sessionExternalId: z.string() }),
    output: z.object({ runId: z.string(), sent: z.number().int() }),
  },
  'usage.quota': { input: z.undefined(), output: QuotaOutputSchema },
  'usage.contextGauge': { input: ContextGaugeInputSchema, output: ContextGaugeSchema },
  'usage.contextDetail': { input: z.object({ sessionExternalId: z.string() }), output: ContextDetailOutputSchema },
  'search.query': { input: SearchInputSchema, output: SearchResultsSchema },
  'links.open': { input: z.object({ url: z.string().max(4096) }), output: z.undefined() },
} as const satisfies Record<RequestName, RequestDefinition>

export type Requests = typeof requests
export type RequestInput<N extends RequestName> = z.input<Requests[N]['input']>
export type RequestOutput<N extends RequestName> = z.output<Requests[N]['output']>
