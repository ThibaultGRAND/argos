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

/** Heure seule, « 14:02 ». */
export function formatTime(iso: string, locale: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
}

/** Date et heure complètes, pour la fiche d'une session. */
export function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/** Durée entre deux dates : « < 1 min », « 18 min », « 1 h 05 ». */
export function formatDuration(fromIso: string, toIso: string): string {
  const minutes = Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000)
  if (!Number.isFinite(minutes) || minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

/** Chemin relatif au projet quand le fichier est dans le projet, sinon le chemin raccourci. */
export function relativeToProject(path: string, projectPath: string): string {
  const separator = projectPath.includes('\\') ? '\\' : '/'
  const prefix = projectPath.endsWith(separator) ? projectPath : `${projectPath}${separator}`
  return path.startsWith(prefix) ? path.slice(prefix.length) : shortenPath(path, 60)
}
