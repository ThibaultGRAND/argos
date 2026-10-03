import { truncateForDisplay } from '../../domain/history/message-display'
import type { TimelineEntry, TimelinePage } from '../../domain/history/read-models'
import type { SessionQueries } from '../../domain/ports/session-queries'

const DEFAULT_PAGE_SIZE = 200
const MAX_PAGE_SIZE = 500

/** Une page du compte rendu d'une session : messages et appels d'outils dans l'ordre réel (F02). */
export class ListSessionEntries {
  constructor(private readonly queries: SessionQueries) {}

  execute(sessionId: number, afterSeq = -1, limit = DEFAULT_PAGE_SIZE): TimelinePage {
    const size = Math.min(Math.max(1, limit), MAX_PAGE_SIZE)
    // Une entrée de plus que demandé indique s'il reste une page à charger.
    const rows = this.queries.listEntries(sessionId, afterSeq, size + 1)
    const page = rows.slice(0, size)
    const entries: TimelineEntry[] = page.map((row) =>
      row.kind === 'message' ? { ...row, ...truncateForDisplay(row.text) } : row,
    )
    const last = page.at(-1)
    return { entries, nextSeq: rows.length > size && last !== undefined ? last.seq : null }
  }
}
