import type { DiffHunk, DiffLine, FileDiff, FileStatus } from '../../core/domain/review/diff'

export interface DiffLimits {
  readonly maxLinesPerFile: number
  readonly maxFiles: number
}

/** Chemin tel que git l'écrit : éventuellement entre guillemets avec des échappements, préfixé par a/ ou b/. */
function unquote(raw: string): string {
  const value = raw.trim()
  if (!value.startsWith('"')) return value
  const bytes: number[] = []
  const escapes: Record<string, number> = { n: 10, t: 9, '"': 34, '\\': 92, a: 7, b: 8, f: 12, r: 13, v: 11 }
  for (let index = 1; index < value.length - 1; index++) {
    const character = value[index] ?? ''
    if (character !== '\\') {
      bytes.push(...Buffer.from(character, 'utf8'))
      continue
    }
    const next = value[index + 1] ?? ''
    if (/[0-7]/.test(next)) {
      bytes.push(parseInt(value.slice(index + 1, index + 4), 8))
      index += 3
    } else {
      bytes.push(escapes[next] ?? next.charCodeAt(0))
      index += 1
    }
  }
  return Buffer.from(bytes).toString('utf8')
}

const stripPrefix = (path: string): string => path.replace(/^[ab]\//, '')

interface Draft {
  path: string
  oldPath: string | null
  status: FileStatus
  binary: boolean
  additions: number
  deletions: number
  hunks: { oldStart: number; newStart: number; section: string; lines: DiffLine[] }[]
  lineCount: number
  truncated: boolean
  oldCursor: number
  newCursor: number
}

/** Analyse la sortie de `git diff` (format unifié) en fichiers, blocs et lignes numérotées. */
export function parseUnifiedDiff(output: string, limits: DiffLimits): { files: FileDiff[]; truncated: boolean } {
  const files: Draft[] = []
  let current: Draft | undefined
  let truncatedFiles = false

  const finish = (): void => {
    if (current !== undefined) files.push(current)
    current = undefined
  }

  for (const line of output.split('\n')) {
    if (line.startsWith('diff --git ')) {
      finish()
      if (files.length >= limits.maxFiles) {
        truncatedFiles = true
        break
      }
      // Chemin provisoire (moitié droite de l'en-tête) ; précisé par ---/+++ ou rename.
      const header = line.slice('diff --git '.length)
      const half = header.length >= 2 ? header.slice(Math.floor(header.length / 2) + 1) : header
      current = {
        path: stripPrefix(unquote(half)),
        oldPath: null,
        status: 'modified',
        binary: false,
        additions: 0,
        deletions: 0,
        hunks: [],
        lineCount: 0,
        truncated: false,
        oldCursor: 0,
        newCursor: 0,
      }
      continue
    }
    if (current === undefined) continue
    const file = current

    if (file.hunks.length === 0) {
      if (line.startsWith('new file mode')) file.status = 'added'
      else if (line.startsWith('deleted file mode')) file.status = 'deleted'
      else if (line.startsWith('rename from ')) {
        file.status = 'renamed'
        file.oldPath = unquote(line.slice('rename from '.length))
      } else if (line.startsWith('rename to ')) file.path = unquote(line.slice('rename to '.length))
      else if (line.startsWith('--- ')) {
        const path = unquote(line.slice(4))
        if (path !== '/dev/null' && file.status === 'renamed') file.oldPath = stripPrefix(path)
      } else if (line.startsWith('+++ ')) {
        const path = unquote(line.slice(4))
        if (path !== '/dev/null') file.path = stripPrefix(path)
      } else if (line.startsWith('Binary files ')) file.binary = true
    }

    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@ ?(.*)$/.exec(line)
    if (hunk !== null) {
      file.oldCursor = Number(hunk[1])
      file.newCursor = Number(hunk[2])
      if (!file.truncated)
        file.hunks.push({ oldStart: file.oldCursor, newStart: file.newCursor, section: hunk[3] ?? '', lines: [] })
      continue
    }

    const target = file.hunks.at(-1)
    if (target === undefined) continue
    const marker = line[0]
    if (marker !== '+' && marker !== '-' && marker !== ' ') continue // « \ No newline at end of file »

    if (marker === '+') file.additions += 1
    if (marker === '-') file.deletions += 1
    const entry: DiffLine =
      marker === '+'
        ? { type: 'add', oldNumber: null, newNumber: file.newCursor++, text: line.slice(1) }
        : marker === '-'
          ? { type: 'del', oldNumber: file.oldCursor++, newNumber: null, text: line.slice(1) }
          : { type: 'context', oldNumber: file.oldCursor++, newNumber: file.newCursor++, text: line.slice(1) }

    if (file.lineCount >= limits.maxLinesPerFile) {
      file.truncated = true
      continue
    }
    file.lineCount += 1
    target.lines.push(entry)
  }
  finish()

  return {
    truncated: truncatedFiles,
    files: files.map(({ path, oldPath, status, binary, additions, deletions, hunks, truncated }): FileDiff => ({
      path,
      oldPath,
      status,
      binary,
      additions,
      deletions,
      hunks: hunks.filter((hunk) => hunk.lines.length > 0) as DiffHunk[],
      truncated,
    })),
  }
}
