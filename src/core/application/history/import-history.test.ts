import { describe, expect, it } from 'vitest'
import type { HistoryEvent } from '../../domain/history/events'
import type { ImportCursor, ReadChunk, SourceFile } from '../../domain/history/history-source'
import type { ApplyResult, HistoryIndex } from '../../domain/ports/history-index'
import type { HistorySource } from '../../domain/ports/history-source'
import { ImportHistory } from './import-history'

class FakeSource implements HistorySource {
  readonly providerId = 'claude' as const
  readonly parserVersion = 1
  constructor(
    private readonly files: SourceFile[],
    private readonly failing = new Set<string>(),
  ) {}
  async discover(): Promise<readonly SourceFile[]> {
    return this.files
  }
  async readChunk(file: SourceFile, fromOffset: number): Promise<ReadChunk> {
    if (this.failing.has(file.path)) throw new Error('illisible')
    const event: HistoryEvent = { type: 'title-changed', source: 'custom', title: `${file.path}@${fromOffset}` }
    return { events: [event], nextOffset: file.size, reachedEnd: true, skippedLines: 0 }
  }
}

class FakeIndex implements HistoryIndex {
  readonly saved = new Map<string, ImportCursor>()
  readonly resets: string[] = []
  readonly applied: string[] = []
  cursors(): ReadonlyMap<string, ImportCursor> {
    return this.saved
  }
  resetSource(file: SourceFile): void {
    this.resets.push(file.path)
  }
  applyChunk(_file: SourceFile, events: readonly HistoryEvent[], cursor: ImportCursor): ApplyResult {
    for (const event of events) if (event.type === 'title-changed') this.applied.push(event.title)
    this.saved.set(cursor.sourcePath, cursor)
    return { sessionChanged: true, orphanEvents: 0 }
  }
}

const file = (path: string, size: number): SourceFile => ({ providerId: 'claude', path, sessionExternalId: path, size })

describe('ImportHistory', () => {
  it('lit les nouveaux fichiers puis ignore ceux qui n’ont pas changé', async () => {
    const index = new FakeIndex()
    const importer = new ImportHistory([new FakeSource([file('/a', 10), file('/b', 20)])], index)

    const first = await importer.execute()
    expect(first.filesRead).toBe(2)
    expect(index.applied).toEqual(['/a@0', '/b@0'])

    const second = await importer.execute()
    expect(second.filesRead).toBe(0)
  })

  it('reprend un fichier qui a grandi à la position enregistrée', async () => {
    const index = new FakeIndex()
    index.saved.set('/a', { sourcePath: '/a', byteOffset: 10, fileSize: 10, parserVersion: 1 })
    await new ImportHistory([new FakeSource([file('/a', 25)])], index).execute()
    expect(index.applied).toEqual(['/a@10'])
    expect(index.resets).toEqual([])
  })

  it('réimporte un fichier raccourci depuis le début', async () => {
    const index = new FakeIndex()
    index.saved.set('/a', { sourcePath: '/a', byteOffset: 50, fileSize: 50, parserVersion: 1 })
    await new ImportHistory([new FakeSource([file('/a', 25)])], index).execute()
    expect(index.resets).toEqual(['/a'])
    expect(index.applied).toEqual(['/a@0'])
  })

  it('continue après un fichier en échec et signale la progression', async () => {
    const progress: number[] = []
    const report = await new ImportHistory(
      [new FakeSource([file('/a', 10), file('/b', 10)], new Set(['/a']))],
      new FakeIndex(),
    ).execute(({ done }) => progress.push(done))
    expect(report.failures).toEqual([{ sourcePath: '/a', reason: 'illisible' }])
    expect(report.filesRead).toBe(1)
    expect(progress).toEqual([1, 2])
  })
})
