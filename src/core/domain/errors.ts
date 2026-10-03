/** Erreur métier : porte un code stable, converti en clé de traduction à la frontière IPC. */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Readonly<Record<string, string | number | boolean>> = {},
  ) {
    super(message)
    this.name = 'DomainError'
  }
}
