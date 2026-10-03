/** Réponse de toute requête IPC : aucune exception ne traverse l'IPC (PLAN.md §2.3). */
export interface ContractError {
  /** Code stable, lisible par le code. */
  readonly code: string
  /** Clé de traduction affichée par l'interface. */
  readonly messageKey: string
  readonly details?: Readonly<Record<string, string | number | boolean>>
}

export type Result<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ContractError }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })

export const fail = (error: ContractError): Result<never> => ({ ok: false, error })
