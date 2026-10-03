/** Fournisseurs connus d'Argos. Seul Claude est implémenté avant la V3. */
export const providerIds = ['claude', 'codex', 'gemini'] as const
export type ProviderId = (typeof providerIds)[number]
