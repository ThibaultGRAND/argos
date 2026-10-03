import type { ProviderId } from '../../domain/history/provider'
import type { PathInspector } from '../../domain/ports/path-inspector'
import type { SessionQueries } from '../../domain/ports/session-queries'
import type { Environment, SourceInfo } from '../../domain/settings/environment'

/** Fournisseurs dont l'historique est lu, avec leur dossier ; les autres sont annoncés pour une version future. */
export interface SourceLocation {
  readonly providerId: ProviderId
  readonly directory: string | null
}

/** Informations affichées dans les paramètres : emplacement des données et sources d'historique (F16). */
export class GetEnvironment {
  constructor(
    private readonly dataDirectory: string,
    private readonly sources: readonly SourceLocation[],
    private readonly queries: SessionQueries,
    private readonly paths: PathInspector,
  ) {}

  execute(): Environment {
    const sources: SourceInfo[] = this.sources.map(({ providerId, directory }) => ({
      providerId,
      directory,
      status: directory === null ? 'planned' : this.paths.exists(directory) ? 'available' : 'missing',
      sessionCount: this.queries.countSessions(providerId),
    }))
    return { dataDirectory: this.dataDirectory, sources }
  }
}
