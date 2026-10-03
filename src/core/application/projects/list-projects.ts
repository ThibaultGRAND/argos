import type { ProjectSummary } from '../../domain/history/read-models'
import type { SessionQueries } from '../../domain/ports/session-queries'

/** Projets connus, les plus récemment actifs en premier. */
export class ListProjects {
  constructor(private readonly queries: SessionQueries) {}

  execute(): readonly ProjectSummary[] {
    return this.queries.listProjects()
  }
}
