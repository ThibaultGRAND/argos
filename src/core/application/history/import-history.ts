import { planRead } from '../../domain/history/history-source'
import type { HistoryIndex } from '../../domain/ports/history-index'
import type { HistorySource } from '../../domain/ports/history-source'

export interface ImportProgress {
  readonly done: number
  readonly total: number
}

export interface ImportFailure {
  readonly sourcePath: string
  readonly reason: string
}

export interface ImportReport {
  readonly filesScanned: number
  readonly filesRead: number
  readonly sessionsChanged: number
  readonly skippedLines: number
  readonly orphanEvents: number
  readonly failures: readonly ImportFailure[]
}

/**
 * Import incrémental de l'historique de tous les fournisseurs (PLAN.md §2.3, flux A).
 * Un fichier en échec n'arrête pas l'import des autres.
 */
export class ImportHistory {
  constructor(
    private readonly sources: readonly HistorySource[],
    private readonly index: HistoryIndex,
  ) {}

  async execute(onProgress: (progress: ImportProgress) => void = () => undefined): Promise<ImportReport> {
    const discovered = await Promise.all(
      this.sources.map(async (source) => ({ source, files: await source.discover() })),
    )
    const total = discovered.reduce((sum, { files }) => sum + files.length, 0)

    let done = 0
    let filesRead = 0
    let sessionsChanged = 0
    let skippedLines = 0
    let orphanEvents = 0
    const failures: ImportFailure[] = []

    for (const { source, files } of discovered) {
      const cursors = this.index.cursors(source.providerId)
      for (const file of files) {
        const plan = planRead(file, cursors.get(file.path), source.parserVersion)
        if (plan !== 'skip') {
          try {
            if (plan === 'reimport') this.index.resetSource(file)
            let offset = plan === 'reimport' ? 0 : (cursors.get(file.path)?.byteOffset ?? 0)
            let changed = false
            for (;;) {
              const chunk = await source.readChunk(file, offset)
              const result = this.index.applyChunk(file, chunk.events, {
                sourcePath: file.path,
                byteOffset: chunk.nextOffset,
                fileSize: file.size,
                parserVersion: source.parserVersion,
              })
              changed ||= result.sessionChanged
              skippedLines += chunk.skippedLines
              orphanEvents += result.orphanEvents
              offset = chunk.nextOffset
              if (chunk.reachedEnd) break
            }
            filesRead += 1
            if (changed) sessionsChanged += 1
          } catch (error) {
            failures.push({ sourcePath: file.path, reason: error instanceof Error ? error.message : String(error) })
          }
        }
        done += 1
        onProgress({ done, total })
      }
    }

    return { filesScanned: total, filesRead, sessionsChanged, skippedLines, orphanEvents, failures }
  }
}
