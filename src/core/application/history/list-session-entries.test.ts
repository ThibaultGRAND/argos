import { describe, expect, it } from 'vitest'
import { MAX_DISPLAYED_MESSAGE_LENGTH } from '../../domain/history/message-display'
import type { MessageRow, SessionQueries, ToolCallRow } from '../../domain/ports/session-queries'
import { ListSessionEntries } from './list-session-entries'

const message = (seq: number, text = `m${seq}`): MessageRow => ({
  kind: 'message',
  seq,
  role: 'user',
  text,
  occurredAt: '2026-10-01T10:00:00.000Z',
})

function queriesWith(rows: (MessageRow | ToolCallRow)[]): SessionQueries {
  return {
    listProjects: () => [],
    listSessions: () => [],
    getSession: () => undefined,
    listSessionFiles: () => [],
    listEntries: (_id, afterSeq, limit) => rows.filter((row) => row.seq > afterSeq).slice(0, limit),
    isKnownPath: () => false,
    countSessions: () => 0,
  }
}

describe('ListSessionEntries', () => {
  const rows = Array.from({ length: 5 }, (_, seq) => message(seq))

  it('renvoie une page et la position de la suivante', () => {
    const page = new ListSessionEntries(queriesWith(rows)).execute(1, -1, 2)
    expect(page.entries.map((entry) => entry.seq)).toEqual([0, 1])
    expect(page.nextSeq).toBe(1)
  })

  it('indique la fin quand tout est chargé', () => {
    const page = new ListSessionEntries(queriesWith(rows)).execute(1, 2, 10)
    expect(page.entries.map((entry) => entry.seq)).toEqual([3, 4])
    expect(page.nextSeq).toBeNull()
  })

  it('tronque les messages trop longs', () => {
    const page = new ListSessionEntries(
      queriesWith([message(0, 'x'.repeat(MAX_DISPLAYED_MESSAGE_LENGTH + 10))]),
    ).execute(1)
    const [entry] = page.entries
    expect(entry?.kind === 'message' && entry.truncated).toBe(true)
    expect(entry?.kind === 'message' && entry.text.length).toBe(MAX_DISPLAYED_MESSAGE_LENGTH)
  })
})
