import { DomainError } from '../../domain/errors'
import { buildEditorUrl } from '../../domain/editor/editors'
import type { EditorLauncher } from '../../domain/ports/editor-launcher'
import type { PathInspector } from '../../domain/ports/path-inspector'
import type { PreferencesRepository } from '../../domain/ports/preferences-repository'
import type { SessionQueries } from '../../domain/ports/session-queries'

/** Ouvre un projet ou un fichier dans l'éditeur choisi (F04), seulement pour des chemins connus d'Argos. */
export class OpenInEditor {
  constructor(
    private readonly preferences: PreferencesRepository,
    private readonly queries: SessionQueries,
    private readonly paths: PathInspector,
    private readonly launcher: EditorLauncher,
  ) {}

  async execute(path: string, line?: number): Promise<void> {
    if (!this.queries.isKnownPath(path)) throw new DomainError('unknown_path', 'Chemin inconnu d’Argos', { path })
    if (!this.paths.exists(path)) throw new DomainError('file_not_found', 'Fichier introuvable', { path })
    const { editor } = await this.preferences.load()
    await this.launcher.open(buildEditorUrl(editor, path, line))
  }
}
