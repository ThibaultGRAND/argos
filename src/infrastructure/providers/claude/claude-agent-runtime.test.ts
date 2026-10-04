import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import { describe, expect, it } from 'vitest'
import { toLiveEvents } from './claude-agent-runtime'

/** Messages du SDK réduits aux champs utilisés ; la conversion ne lit rien d'autre. */
const sdk = (message: unknown): SDKMessage => message as SDKMessage

describe('toLiveEvents', () => {
  it('identifie la session et suit son état', () => {
    expect(
      toLiveEvents(sdk({ type: 'system', subtype: 'init', session_id: 's-1', model: 'claude-opus-5-5' }), undefined),
    ).toEqual([
      { type: 'identified', sessionExternalId: 's-1', model: 'claude-opus-5-5' },
      { type: 'status', status: 'running' },
    ])
    expect(
      toLiveEvents(sdk({ type: 'system', subtype: 'session_state_changed', state: 'requires_action' }), undefined),
    ).toEqual([{ type: 'status', status: 'waiting' }])
  })

  it('transmet le texte au fil de l’eau, puis le texte complet', () => {
    const delta = sdk({
      type: 'stream_event',
      parent_tool_use_id: null,
      event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Bon' } },
    })
    expect(toLiveEvents(delta, 'msg-1')).toEqual([{ type: 'assistant-delta', messageId: 'msg-1', text: 'Bon' }])

    const full = toLiveEvents(
      sdk({
        type: 'assistant',
        uuid: 'u',
        parent_tool_use_id: null,
        message: {
          id: 'msg-1',
          model: 'claude-opus-5-5',
          content: [
            { type: 'text', text: 'Bonjour' },
            { type: 'tool_use', id: 't1', name: 'Edit', input: { file_path: '/p/a.ts' } },
          ],
        },
      }),
      'msg-1',
    )
    expect(full[0]).toMatchObject({ type: 'assistant-text', messageId: 'msg-1', text: 'Bonjour' })
    expect(full[1]).toMatchObject({ type: 'tool-call', externalId: 't1', kind: 'edit', target: '/p/a.ts' })
  })

  it('convertit les résultats d’outils avec les lignes modifiées et la fin du tour', () => {
    const result = toLiveEvents(
      sdk({
        type: 'user',
        parent_tool_use_id: null,
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] },
        tool_use_result: { filePath: '/p/a.ts', structuredPatch: [{ lines: ['+a', '-b'] }] },
      }),
      undefined,
    )
    expect(result).toMatchObject([
      {
        type: 'tool-result',
        toolCallExternalId: 't1',
        status: 'success',
        fileChanges: [{ linesAdded: 1, linesRemoved: 1 }],
      },
    ])
    expect(
      toLiveEvents(sdk({ type: 'result', subtype: 'success', is_error: false, duration_ms: 1200 }), undefined),
    ).toEqual([{ type: 'turn-completed', isError: false, durationMs: 1200 }])
  })

  it('laisse de côté les messages des sous-agents', () => {
    expect(
      toLiveEvents(
        sdk({ type: 'assistant', uuid: 'u', parent_tool_use_id: 't9', message: { id: 'm', content: [] } }),
        'm',
      ),
    ).toEqual([])
  })

  it('transmet le contexte de chaque appel et la taille exacte des fenêtres en fin de tour (F08)', () => {
    const events = toLiveEvents(
      sdk({
        type: 'assistant',
        uuid: 'u',
        parent_tool_use_id: null,
        message: {
          id: 'm',
          model: 'claude-opus-5-5',
          content: [],
          usage: { input_tokens: 2, cache_read_input_tokens: 1000, cache_creation_input_tokens: 10, output_tokens: 5 },
        },
      }),
      'm',
    )
    expect(events).toEqual([{ type: 'usage', model: 'claude-opus-5-5', contextTokens: 1017 }])
    expect(
      toLiveEvents(
        sdk({
          type: 'result',
          subtype: 'success',
          is_error: false,
          duration_ms: 10,
          modelUsage: { 'claude-opus-5-5': { contextWindow: 1_000_000 }, 'claude-haiku-4-5': { contextWindow: 0 } },
        }),
        undefined,
      ),
    ).toEqual([
      { type: 'context-windows', windows: [{ model: 'claude-opus-5-5', contextWindow: 1_000_000 }] },
      { type: 'turn-completed', isError: false, durationMs: 10 },
    ])
  })
})
