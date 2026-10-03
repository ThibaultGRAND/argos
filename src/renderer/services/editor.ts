import { argos, unwrap } from './argos'

/** Ouvre un projet ou un fichier dans l'éditeur choisi dans les paramètres (F04). */
export async function openInEditor(path: string, line?: number): Promise<void> {
  unwrap<'editor.open'>(await argos.invoke('editor.open', line === undefined ? { path } : { path, line }))
}
