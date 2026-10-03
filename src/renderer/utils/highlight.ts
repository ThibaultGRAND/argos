import { HIGHLIGHT_END, HIGHLIGHT_START } from '@shared/contract'

export interface SnippetPart {
  readonly text: string
  readonly highlighted: boolean
}

/** Découpe un extrait de recherche en morceaux surlignés ou non, sans jamais produire de HTML. */
export function splitSnippet(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = []
  let rest = snippet
  while (rest !== '') {
    const start = rest.indexOf(HIGHLIGHT_START)
    if (start === -1) {
      parts.push({ text: rest, highlighted: false })
      break
    }
    if (start > 0) parts.push({ text: rest.slice(0, start), highlighted: false })
    const end = rest.indexOf(HIGHLIGHT_END, start + 1)
    const stop = end === -1 ? rest.length : end
    parts.push({ text: rest.slice(start + 1, stop), highlighted: true })
    rest = end === -1 ? '' : rest.slice(end + 1)
  }
  return parts.map((part) => ({ ...part, text: part.text.replace(/\s+/g, ' ') }))
}
