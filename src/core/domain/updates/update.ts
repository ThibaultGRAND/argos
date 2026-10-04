/**
 * Mises à jour de l'app installée (F09). Sans signature payante, l'installation automatique n'est possible
 * que sur Windows et avec l'AppImage de Linux ; ailleurs, l'app signale la version et ouvre sa page de téléchargement.
 */
export type UpdateMode = 'automatic' | 'manual'

export type UpdateState =
  /** App lancée en développement : rien n'est vérifié. */
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'idle' }
  | { readonly kind: 'checking' }
  | { readonly kind: 'up-to-date'; readonly checkedAt: string }
  /** Nouvelle version : à télécharger depuis sa page (mode manuel) ou en cours de téléchargement (mode automatique). */
  | { readonly kind: 'available'; readonly version: string; readonly mode: UpdateMode }
  | { readonly kind: 'downloading'; readonly version: string; readonly percent: number }
  /** Téléchargée : s'installe au redémarrage. */
  | { readonly kind: 'ready'; readonly version: string }
  | { readonly kind: 'error'; readonly message: string; readonly checkedAt: string }

export type Platform = 'darwin' | 'win32' | 'linux' | 'other'

/** Mode d'installation selon l'OS et le format installé (`isAppImage` : Linux lancé depuis une AppImage). */
export function updateModeFor(platform: Platform, isAppImage: boolean): UpdateMode {
  if (platform === 'win32') return 'automatic'
  if (platform === 'linux' && isAppImage) return 'automatic'
  // macOS sans signature Apple, paquet .deb (droits administrateur), autres : l'utilisateur télécharge lui-même.
  return 'manual'
}

/** Page GitHub d'une version, à partir de l'adresse du dépôt. */
export function releasePageUrl(repositoryUrl: string, version: string): string {
  return `${repositoryUrl.replace(/\/+$/, '')}/releases/tag/v${version}`
}

/** Intervalle entre deux vérifications automatiques. */
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
