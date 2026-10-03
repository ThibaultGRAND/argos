const allowedProtocols = new Set(['http:', 'https:', 'mailto:'])

/** Un lien d'une conversation ne peut ouvrir qu'une page web ou une adresse e-mail, jamais un fichier ou un programme. */
export function isSafeExternalUrl(url: string): boolean {
  try {
    return allowedProtocols.has(new URL(url).protocol)
  } catch (error) {
    if (error instanceof TypeError) return false
    throw error
  }
}
