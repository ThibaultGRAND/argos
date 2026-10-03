/** Ouvre un lien d'application d'éditeur (vscode://…) via le système. */
export interface EditorLauncher {
  open(url: string): Promise<void>
}
