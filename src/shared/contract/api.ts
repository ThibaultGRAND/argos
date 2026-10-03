import type { EventName, RequestName } from './channels'
import type { EventPayload } from './events'
import type { RequestInput, RequestOutput } from './requests'
import type { Result } from './result'

type InputArgs<N extends RequestName> = RequestInput<N> extends undefined ? [] : [input: RequestInput<N>]

/** API exposée à l'interface sous `window.argos`, générée à partir du contrat par le preload. */
export interface ArgosApi {
  invoke<N extends RequestName>(name: N, ...args: InputArgs<N>): Promise<Result<RequestOutput<N>>>
  /** S'abonne à un événement ; renvoie la fonction de désabonnement. */
  on<E extends EventName>(name: E, listener: (payload: EventPayload<E>) => void): () => void
}
