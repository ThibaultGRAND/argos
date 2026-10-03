/**
 * Règles d'architecture d'Argos (PLAN.md §2.1).
 * Toute violation fait échouer `npm run check:architecture` et la CI.
 */
const layer = (name) => `^src/${name}/`

module.exports = {
  forbidden: [
    {
      name: 'pas-de-cycle',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'shared-autonome',
      comment: 'shared ne dépend d’aucune autre couche ni de Node.',
      severity: 'error',
      from: { path: layer('shared') },
      to: { path: '^src/', pathNot: layer('shared') },
    },
    {
      name: 'shared-sans-node',
      severity: 'error',
      from: { path: layer('shared') },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'domaine-pur',
      comment: 'Le domaine ne dépend de rien : ni autre couche, ni paquet npm, ni Node.',
      severity: 'error',
      from: { path: layer('core/domain') },
      to: { pathNot: layer('core/domain') },
    },
    {
      name: 'application-vers-domaine-seulement',
      severity: 'error',
      from: { path: layer('core/application') },
      to: { pathNot: [layer('core/domain'), layer('core/application')] },
    },
    {
      name: 'infrastructure-vers-domaine-seulement',
      comment: 'Les adaptateurs implémentent des ports, ils n’appellent pas les cas d’usage.',
      severity: 'error',
      from: { path: layer('infrastructure') },
      to: {
        path: '^src/',
        pathNot: [layer('core/domain'), layer('infrastructure')],
      },
    },
    {
      name: 'renderer-vers-shared-seulement',
      comment: 'L’interface ne voit que le contrat (DTO), jamais le domaine ni Node.',
      severity: 'error',
      from: { path: layer('renderer') },
      to: { path: '^src/', pathNot: [layer('renderer'), layer('shared')] },
    },
    {
      name: 'renderer-sans-node',
      severity: 'error',
      from: { path: layer('renderer') },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'preload-vers-shared-seulement',
      severity: 'error',
      from: { path: layer('preload') },
      to: { path: '^src/', pathNot: [layer('preload'), layer('shared')] },
    },
    {
      name: 'main-pas-vers-renderer-preload-indexer',
      severity: 'error',
      from: { path: layer('main') },
      to: { path: [layer('renderer'), layer('preload'), layer('indexer')] },
    },
    {
      name: 'indexer-sans-ui-ni-main',
      severity: 'error',
      from: { path: layer('indexer') },
      to: { path: [layer('renderer'), layer('preload'), layer('main')] },
    },
    {
      name: 'electron-reserve-a-main-et-preload',
      comment: 'Seuls le processus principal et le preload utilisent Electron.',
      severity: 'error',
      from: { pathNot: [layer('main'), layer('preload')] },
      to: { path: '^node_modules/electron/' },
    },
    {
      name: 'drizzle-reserve-a-la-base',
      comment: 'Drizzle et better-sqlite3 ne sortent pas de la couche base de données (CLAUDE.md §5.2).',
      severity: 'error',
      from: { pathNot: layer('infrastructure/database') },
      to: { path: ['^node_modules/drizzle-orm/', '^node_modules/better-sqlite3/'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.node.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.vue', '.js', '.mjs', '.json'],
    },
    exclude: { path: '\\.test\\.ts$' },
  },
}
