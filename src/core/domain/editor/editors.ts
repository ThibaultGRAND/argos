/** Éditeurs proposés, ouverts par leur lien d'application (F04). */
export const editorIds = ['vscode', 'vscode-insiders', 'cursor', 'vscodium'] as const
export type EditorId = (typeof editorIds)[number]

const schemes: Readonly<Record<EditorId, string>> = {
  vscode: 'vscode',
  'vscode-insiders': 'vscode-insiders',
  cursor: 'cursor',
  vscodium: 'vscodium',
}

/**
 * Lien qui ouvre un fichier ou un dossier dans l'éditeur, par exemple `vscode://file/Users/moi/projet/a.ts:12`.
 * Les chemins Windows (`C:\dossier\a.ts`) deviennent `/C:/dossier/a.ts` ; chaque segment est encodé.
 */
export function buildEditorUrl(editor: EditorId, absolutePath: string, line?: number): string {
  const slashed = absolutePath.replace(/\\/g, '/')
  const withRoot = /^[A-Za-z]:\//.test(slashed) ? `/${slashed}` : slashed
  const encoded = withRoot
    .split('/')
    .map((segment) => (/^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)))
    .join('/')
  const position = line !== undefined && line > 0 ? `:${line}` : ''
  return `${schemes[editor]}://file${encoded}${position}`
}
