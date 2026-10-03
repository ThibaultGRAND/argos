/** Type normalisé d'un appel d'outil, identique pour tous les fournisseurs (PLAN.md §2.2). */
export const toolKinds = ['read', 'edit', 'write', 'command', 'search', 'web', 'subagent', 'other'] as const
export type ToolKind = (typeof toolKinds)[number]
