/** Accès en lecture seule au système de fichiers : existence d'un chemin. */
export interface PathInspector {
  exists(path: string): boolean
}
