import { describe, expect, it } from 'vitest'
import { contextBreakdownFrom, contextLimitsFrom } from './claude-context-usage'

/** Réponse réelle de `getContextUsage({ detail: 'full' })` (Haiku, projet sans CLAUDE.md), réduite aux champs lus. */
const response = {
  model: 'claude-haiku-4-5-20251001',
  totalTokens: 31_264,
  maxTokens: 200_000,
  autoCompactThreshold: 167_000,
  isAutoCompactEnabled: true,
  categories: [
    { name: 'System prompt', kind: 'used', tokens: 6378 },
    { name: 'System tools', kind: 'used', tokens: 18_509 },
    { name: 'MCP server instructions', kind: 'used', tokens: 1705 },
    { name: 'MCP tools (deferred)', kind: 'deferred', tokens: 41_690, isDeferred: true },
    { name: 'Skills', kind: 'used', tokens: 2152 },
    { name: 'Messages', kind: 'used', tokens: 2520 },
    { name: 'Nouvelle catégorie', kind: 'used', tokens: 10 },
    { name: 'Autocompact buffer', kind: 'buffer', tokens: 33_000 },
    { name: 'Free space', kind: 'free', tokens: 135_736 },
  ],
  memoryFiles: [{ path: '/projets/site-esf/CLAUDE.md', type: 'Project', tokens: 1200 }],
}

describe('contexte Claude', () => {
  it('lit la fenêtre et le seuil du compactage automatique', () => {
    expect(contextLimitsFrom(response)).toEqual({ window: 200_000, autoCompactAt: 167_000 })
    expect(contextLimitsFrom({ ...response, isAutoCompactEnabled: false })).toEqual({
      window: 200_000,
      autoCompactAt: null,
    })
    expect(contextLimitsFrom({ maxTokens: 0 })).toBeNull()
  })

  it('classe les catégories, écarte les outils différés et garde le libellé des inconnues', () => {
    const breakdown = contextBreakdownFrom(response)
    expect(breakdown?.categories.map((category) => [category.id, category.tokens])).toEqual([
      ['system-prompt', 6378],
      ['system-tools', 18_509],
      ['mcp-instructions', 1705],
      ['skills', 2152],
      ['messages', 2520],
      ['other', 10],
      ['buffer', 33_000],
      ['free', 135_736],
    ])
    expect(breakdown?.categories[5]?.label).toBe('Nouvelle catégorie')
    expect(breakdown).toMatchObject({ totalTokens: 31_264, window: 200_000, autoCompactAt: 167_000 })
    expect(breakdown?.memoryFiles).toEqual([{ path: '/projets/site-esf/CLAUDE.md', tokens: 1200 }])
  })
})
