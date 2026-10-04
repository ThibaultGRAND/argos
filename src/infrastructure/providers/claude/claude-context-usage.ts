import type { ContextBreakdown, ContextCategoryId, ContextLimits } from '../../../core/domain/usage/usage'

/**
 * Lecture de la réponse `getContextUsage` de l'Agent SDK (F08).
 * Les catégories sont classées par leur `kind` ; leur nom anglais ne sert qu'à choisir un libellé traduit.
 */

type JsonRecord = Readonly<Record<string, unknown>>
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const asCount = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined

const categoryIds: Readonly<Record<string, ContextCategoryId>> = {
  'system prompt': 'system-prompt',
  'system tools': 'system-tools',
  'mcp tools': 'mcp-tools',
  'mcp server instructions': 'mcp-instructions',
  'custom agents': 'agents',
  agents: 'agents',
  'memory files': 'memory',
  skills: 'skills',
  messages: 'messages',
}

export function contextLimitsFrom(response: unknown): ContextLimits | null {
  if (!isRecord(response)) return null
  const window = asCount(response['maxTokens'])
  if (window === undefined || window === 0) return null
  const threshold = asCount(response['autoCompactThreshold'])
  const enabled = response['isAutoCompactEnabled'] !== false
  return { window, autoCompactAt: enabled && threshold !== undefined && threshold > 0 ? threshold : null }
}

export function contextBreakdownFrom(response: unknown): ContextBreakdown | null {
  const limits = contextLimitsFrom(response)
  if (limits === null || !isRecord(response)) return null

  const categories: ContextBreakdown['categories'][number][] = []
  for (const raw of Array.isArray(response['categories']) ? response['categories'] : []) {
    if (!isRecord(raw)) continue
    const tokens = asCount(raw['tokens'])
    const label = typeof raw['name'] === 'string' ? raw['name'] : ''
    const kind = raw['kind']
    // Les schémas d'outils différés ne sont pas dans la fenêtre.
    if (tokens === undefined || tokens === 0 || kind === 'deferred' || raw['isDeferred'] === true) continue
    const id: ContextCategoryId =
      kind === 'free' ? 'free' : kind === 'buffer' ? 'buffer' : (categoryIds[label.toLowerCase()] ?? 'other')
    categories.push({ id, label, tokens })
  }

  const memoryFiles = (Array.isArray(response['memoryFiles']) ? response['memoryFiles'] : []).flatMap((raw) => {
    if (!isRecord(raw) || typeof raw['path'] !== 'string') return []
    const tokens = asCount(raw['tokens'])
    return tokens === undefined ? [] : [{ path: raw['path'], tokens }]
  })

  return {
    model: typeof response['model'] === 'string' ? response['model'] : '',
    totalTokens: asCount(response['totalTokens']) ?? 0,
    window: limits.window,
    autoCompactAt: limits.autoCompactAt,
    categories,
    memoryFiles,
  }
}
