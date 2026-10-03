/** Au-delà de cette longueur, un message est tronqué pour l'affichage (un message collé peut peser des mégaoctets). */
export const MAX_DISPLAYED_MESSAGE_LENGTH = 20_000

export function truncateForDisplay(text: string): { readonly text: string; readonly truncated: boolean } {
  return text.length <= MAX_DISPLAYED_MESSAGE_LENGTH
    ? { text, truncated: false }
    : { text: text.slice(0, MAX_DISPLAYED_MESSAGE_LENGTH), truncated: true }
}
