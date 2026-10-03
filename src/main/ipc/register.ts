import { BrowserWindow, ipcMain } from 'electron'
import { DomainError } from '../../core/domain/errors'
import {
  eventChannel,
  events,
  fail,
  ok,
  requestChannel,
  requestNames,
  requests,
  type EventName,
  type EventPayload,
  type RequestName,
  type RequestOutput,
  type Result,
} from '../../shared/contract'
import type { z } from 'zod'

/** Un gestionnaire par requête du contrat : l'entrée reçue est déjà validée par Zod. */
export type RequestHandlers = {
  [N in RequestName]: (input: z.output<(typeof requests)[N]['input']>) => Promise<RequestOutput<N>> | RequestOutput<N>
}

/**
 * Branche chaque requête du contrat sur son gestionnaire.
 * Valide l'entrée et la sortie, et convertit toute erreur en `Result` (aucune exception ne traverse l'IPC).
 */
export function registerRequestHandlers(handlers: RequestHandlers, log: (message: string) => void): void {
  for (const name of requestNames) {
    ipcMain.handle(requestChannel(name), async (_event, rawInput: unknown) => handle(name, rawInput, handlers, log))
  }
}

async function handle<N extends RequestName>(
  name: N,
  rawInput: unknown,
  handlers: RequestHandlers,
  log: (message: string) => void,
): Promise<Result<RequestOutput<N>>> {
  const definition = requests[name]
  const input = definition.input.safeParse(rawInput)
  if (!input.success) {
    return fail({ code: 'invalid_input', messageKey: 'errors.invalid_input' })
  }
  try {
    const handler = handlers[name] as (input: unknown) => Promise<unknown> | unknown
    const output = definition.output.parse(await handler(input.data))
    return ok(output as RequestOutput<N>)
  } catch (error) {
    if (error instanceof DomainError) {
      return fail({ code: error.code, messageKey: `errors.${error.code}`, details: error.details })
    }
    log(`Erreur inattendue sur ${name} : ${error instanceof Error ? error.message : String(error)}`)
    return fail({ code: 'unknown', messageKey: 'errors.unknown' })
  }
}

/** Diffuse un événement du contrat à toutes les fenêtres, après validation. */
export function broadcast<E extends EventName>(name: E, payload: EventPayload<E>): void {
  const validated = events[name].parse(payload)
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(eventChannel(name), validated)
  }
}
