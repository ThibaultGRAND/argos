/** Diff entre deux snapshots, fichier par fichier (F07). */
export type DiffLineType = 'context' | 'add' | 'del'

export interface DiffLine {
  readonly type: DiffLineType
  readonly oldNumber: number | null
  readonly newNumber: number | null
  readonly text: string
}

export interface DiffHunk {
  readonly oldStart: number
  readonly newStart: number
  /** Contexte affiché par git après `@@` (souvent la fonction englobante). */
  readonly section: string
  readonly lines: readonly DiffLine[]
}

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed'

export interface FileDiff {
  readonly path: string
  readonly oldPath: string | null
  readonly status: FileStatus
  readonly binary: boolean
  readonly additions: number
  readonly deletions: number
  readonly hunks: readonly DiffHunk[]
  /** Vrai si le diff du fichier a été coupé (trop de lignes). */
  readonly truncated: boolean
}
