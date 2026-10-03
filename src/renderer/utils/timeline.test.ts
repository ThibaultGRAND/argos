import { describe, expect, it } from 'vitest'
import type { TimelineEntryDto } from '@shared/contract'
import { groupTimeline } from './timeline'

const at = '2026-10-01T10:00:00.000Z'
const message = (seq: number, role: 'user' | 'assistant'): TimelineEntryDto => ({
  kind: 'message',
  seq,
  role,
  text: `m${seq}`,
  truncated: false,
  occurredAt: at,
})
const tool = (seq: number, toolKind: string, status: 'success' | 'error' = 'success'): TimelineEntryDto => ({
  kind: 'tool',
  seq,
  toolName: toolKind,
  toolKind,
  target: null,
  summary: null,
  status,
  linesAdded: 0,
  linesRemoved: 0,
  occurredAt: at,
})

describe('groupTimeline', () => {
  it('regroupe les appels consécutifs et numérote les blocs', () => {
    const blocks = groupTimeline([
      message(0, 'user'),
      tool(1, 'read'),
      tool(2, 'read'),
      tool(3, 'search', 'error'),
      message(4, 'assistant'),
      tool(5, 'edit'),
    ])
    expect(blocks.map((block) => [block.type, block.number])).toEqual([
      ['message', 1],
      ['tools', 2],
      ['message', 3],
      ['tools', 4],
    ])
    const group = blocks[1]
    expect(group?.type === 'tools' && group.counts).toEqual([
      ['read', 2],
      ['search', 1],
    ])
    expect(group?.type === 'tools' && group.errors).toBe(1)
  })

  it('renvoie une liste vide pour une session vide', () => {
    expect(groupTimeline([])).toEqual([])
  })
})
