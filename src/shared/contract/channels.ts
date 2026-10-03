/**
 * Noms des requêtes et des événements, sans dépendance : le preload (en sandbox) n'importe que ce fichier.
 * Les schémas correspondants sont dans requests.ts et events.ts, qui doivent couvrir exactement ces noms.
 */
export const requestNames = [
  'app.info',
  'preferences.get',
  'preferences.update',
  'indexer.status',
  'projects.list',
  'sessions.list',
  'sessions.get',
  'sessions.entries',
  'links.open',
  'search.query',
  'editor.open',
  'settings.environment',
  'index.rebuild',
  'live.start',
  'live.continue',
  'live.send',
  'live.interrupt',
  'live.stop',
  'live.answer',
  'live.list',
  'sessions.findByExternal',
] as const
export type RequestName = (typeof requestNames)[number]

export const eventNames = ['indexer.status', 'index.updated', 'live.event'] as const
export type EventName = (typeof eventNames)[number]

export const requestChannel = (name: RequestName): string => `argos:request:${name}`
export const eventChannel = (name: EventName): string => `argos:event:${name}`
