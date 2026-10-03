import type { ContractError, RequestName, RequestOutput, Result } from '@shared/contract'

/** Erreur renvoyée par le processus principal, avec sa clé de traduction. */
export class ArgosRequestError extends Error {
  constructor(readonly error: ContractError) {
    super(error.code)
    this.name = 'ArgosRequestError'
  }
}

/** Déballe un `Result` : les stores travaillent avec des valeurs ou des erreurs explicites. */
export function unwrap<N extends RequestName>(result: Result<RequestOutput<N>>): RequestOutput<N> {
  if (result.ok) return result.data
  throw new ArgosRequestError(result.error)
}

export const argos = window.argos
