import type { MessageEntryDto, TimelineEntryDto, ToolEntryDto } from '@shared/contract'

/** Bloc affiché dans le compte rendu : un message, ou une suite d'appels d'outils consécutifs regroupés. */
export type TimelineBlock =
  | { readonly type: 'message'; readonly number: number; readonly entry: MessageEntryDto }
  | {
      readonly type: 'tools'
      readonly number: number
      readonly entries: readonly ToolEntryDto[]
      /** Nombre d'appels par type normalisé, dans l'ordre de première apparition. */
      readonly counts: readonly (readonly [kind: string, count: number])[]
      readonly errors: number
    }

/** Regroupe les appels d'outils consécutifs et numérote les blocs à partir de 1. */
export function groupTimeline(entries: readonly TimelineEntryDto[]): TimelineBlock[] {
  const blocks: TimelineBlock[] = []
  let tools: ToolEntryDto[] = []

  const flushTools = (): void => {
    if (tools.length === 0) return
    const counts = new Map<string, number>()
    for (const tool of tools) counts.set(tool.toolKind, (counts.get(tool.toolKind) ?? 0) + 1)
    blocks.push({
      type: 'tools',
      number: blocks.length + 1,
      entries: tools,
      counts: [...counts.entries()],
      errors: tools.filter((tool) => tool.status === 'error').length,
    })
    tools = []
  }

  for (const entry of entries) {
    if (entry.kind === 'tool') {
      tools.push(entry)
    } else {
      flushTools()
      blocks.push({ type: 'message', number: blocks.length + 1, entry })
    }
  }
  flushTools()
  return blocks
}
