import { shell } from 'electron'
import type { EditorLauncher } from '../../core/domain/ports/editor-launcher'

/** Le système ouvre l'éditeur associé au lien (vscode://, cursor://…), sur les 3 OS. */
export class ElectronEditorLauncher implements EditorLauncher {
  open(url: string): Promise<void> {
    return shell.openExternal(url)
  }
}
