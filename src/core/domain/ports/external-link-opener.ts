/** Ouverture d'un lien dans le navigateur ou le client e-mail de l'utilisateur. */
export interface ExternalLinkOpener {
  open(url: string): Promise<void>
}
