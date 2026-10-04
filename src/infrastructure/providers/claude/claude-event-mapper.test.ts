import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { HistoryEvent } from '../../../core/domain/history/events'
import { ClaudeEventMapper } from './claude-event-mapper'

const fixtures = resolve(__dirname, '../../../../tests/fixtures/claude/2.1.284')

function mapFixture(name = 'session-basique.jsonl'): { events: HistoryEvent[]; ignored: number } {
  const fixture = resolve(fixtures, name)
  const mapper = new ClaudeEventMapper()
  const events: HistoryEvent[] = []
  let ignored = 0
  for (const line of readFileSync(fixture, 'utf8').split('\n')) {
    if (line.trim() === '') continue
    const mapped = mapper.mapLine(line)
    if (mapped.ignored) ignored += 1
    events.push(...mapped.events)
  }
  return { events, ignored }
}

describe('ClaudeEventMapper', () => {
  const { events, ignored } = mapFixture()

  it('observe la session une seule fois, avec le chemin réel du projet', () => {
    const observed = events.filter((event) => event.type === 'session-observed')
    expect(observed).toEqual([
      {
        type: 'session-observed',
        projectPath: '/projets/site-esf',
        occurredAt: '2026-10-01T14:02:00.000Z',
        cliVersion: '2.1.284',
        gitBranch: 'main',
      },
    ])
  })

  it('garde les vrais messages de l’utilisateur et convertit les commandes', () => {
    const texts = events.flatMap((event) => (event.type === 'user-message' ? [event.text] : []))
    expect(texts).toEqual([
      'Les pages /cours-collectifs/* renvoient une 404. Corrige sans changer les URL.',
      '/model opus',
    ])
  })

  it('normalise les appels d’outils', () => {
    const calls = events.flatMap((event) =>
      event.type === 'tool-call' ? [[event.toolName, event.kind, event.target]] : [],
    )
    expect(calls).toEqual([
      ['Read', 'read', '/projets/site-esf/src/pages/[...slug].astro'],
      ['Edit', 'edit', '/projets/site-esf/src/lib/slugs.ts'],
      ['Bash', 'command', 'npm run build'],
      ['Write', 'write', '/projets/site-esf/src/lib/slugs.test.ts'],
    ])
  })

  it('compte les lignes modifiées et repère les erreurs', () => {
    const results = events.flatMap((event) => (event.type === 'tool-result' ? [event] : []))
    expect(results.map((result) => [result.toolCallExternalId, result.status])).toEqual([
      ['t1', 'success'],
      ['t2', 'success'],
      ['t3', 'error'],
      ['t4', 'success'],
    ])
    expect(results.flatMap((result) => result.fileChanges)).toEqual([
      { path: '/projets/site-esf/src/lib/slugs.ts', linesAdded: 2, linesRemoved: 1 },
      { path: '/projets/site-esf/src/lib/slugs.test.ts', linesAdded: 2, linesRemoved: 0 },
    ])
  })

  it('garde le texte de l’agent avec son modèle et ignore la réflexion', () => {
    const assistant = events.flatMap((event) => (event.type === 'assistant-message' ? [event] : []))
    expect(assistant.map((event) => [event.text, event.model])).toEqual([
      ['Build OK, 148 pages. Je lance les tests sur slugify.', 'claude-opus-5-5'],
    ])
  })

  it('lit les titres et ignore sans échouer les lignes inconnues ou invalides', () => {
    expect(events.filter((event) => event.type === 'title-changed')).toEqual([
      { type: 'title-changed', source: 'generated', title: 'Corriger le 404 sur les pages cours collectifs' },
      { type: 'title-changed', source: 'custom', title: '404 cours collectifs' },
    ])
    expect(ignored).toBeGreaterThanOrEqual(5)
  })
})

describe('ClaudeEventMapper — consommation (F08)', () => {
  const { events } = mapFixture('session-usage.jsonl')
  const usage = events.flatMap((event) => (event.type === 'usage-reported' ? [event] : []))

  it('émet la consommation de chaque ligne, avec l’identifiant de l’appel et le fil', () => {
    expect(usage.map((event) => [event.messageId, event.sidechain])).toEqual([
      ['m1', false],
      ['m1', false],
      ['m-side', true],
      ['m2', false],
    ])
    expect(usage[3]).toMatchObject({
      inputTokens: 1,
      cacheCreationTokens: 1500,
      cacheReadTokens: 23100,
      outputTokens: 400,
    })
  })

  it('ignore la consommation vide des messages synthétiques', () => {
    expect(usage.some((event) => event.messageId === 'm3')).toBe(false)
  })
})
