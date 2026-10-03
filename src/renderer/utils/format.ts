/** Mise en forme des dates et des modèles selon la langue choisie (CLAUDE.md §5.1). */

const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/** « 14:02 · aujourd'hui », « 09:15 · hier », sinon « 28 sept. » (ou « 28 sept. 2025 » une autre année). */
export function formatWhen(iso: string, locale: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS)
  if (days === 0 || days === 1) {
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day')
    return `${time} · ${relative}`
  }
  const sameYear = date.getFullYear() === now.getFullYear()
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)
}

/** « claude-opus-5-5 » devient « Opus 5.5 » ; un identifiant inconnu est affiché tel quel. */
export function formatModel(model: string): string {
  const match = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/.exec(model)
  if (match === null) return model
  const [, family = '', major = '', minor] = match
  const name = family.charAt(0).toUpperCase() + family.slice(1)
  return minor === undefined ? `${name} ${major}` : `${name} ${major}.${minor}`
}

/** Raccourcit un chemin pour l'affichage : `~` pour le dossier personnel, début tronqué si trop long. */
export function shortenPath(path: string, maxLength = 40): string {
  const home = /^(\/Users\/[^/]+|\/home\/[^/]+|[A-Za-z]:\\Users\\[^\\]+)/.exec(path)?.[0]
  const withHome = home === undefined ? path : `~${path.slice(home.length)}`
  return withHome.length <= maxLength ? withHome : `…${withHome.slice(withHome.length - maxLength + 1)}`
}
