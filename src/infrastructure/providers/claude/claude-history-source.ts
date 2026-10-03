import { readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { ReadChunk, SourceFile } from '../../../core/domain/history/history-source'
import type { HistorySource } from '../../../core/domain/ports/history-source'
import { DomainError } from '../../../core/domain/errors'
import { readLines } from '../../filesystem/line-reader'
import { ClaudeEventMapper } from './claude-event-mapper'

const CHUNK_BYTES = 4 * 1024 * 1024

/**
 * Historique de Claude Code : un fichier `<session>.jsonl` par session, dans un dossier par projet.
 * Les transcriptions des sous-agents (`<session>/subagents/`) ne sont pas lues en V0.
 */
export class ClaudeHistorySource implements HistorySource {
  readonly providerId = 'claude' as const
  readonly parserVersion = 1

  constructor(private readonly projectsDirectory: string) {}

  async discover(): Promise<readonly SourceFile[]> {
    let projectDirectories: string[]
    try {
      projectDirectories = await readdir(this.projectsDirectory)
    } catch (error) {
      // Claude Code n'est pas installé ou n'a encore jamais été utilisé : rien à importer.
      if (isMissing(error)) return []
      throw error
    }

    const files: SourceFile[] = []
    for (const directory of projectDirectories) {
      const directoryPath = join(this.projectsDirectory, directory)
      let entries: string[]
      try {
        entries = await readdir(directoryPath)
      } catch (error) {
        if (isMissing(error) || isNotDirectory(error)) continue
        throw error
      }
      for (const entry of entries) {
        if (!entry.endsWith('.jsonl')) continue
        const path = join(directoryPath, entry)
        const info = await stat(path)
        if (!info.isFile()) continue
        files.push({ providerId: 'claude', path, sessionExternalId: basename(entry, '.jsonl'), size: info.size })
      }
    }
    return files
  }

  async readChunk(file: SourceFile, fromOffset: number): Promise<ReadChunk> {
    let block
    try {
      block = await readLines(file.path, fromOffset, CHUNK_BYTES)
    } catch (error) {
      throw new DomainError('provider_read_failed', `Lecture impossible : ${file.path}`, {
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    const mapper = new ClaudeEventMapper()
    const events = []
    let skippedLines = 0
    for (const line of block.lines) {
      if (line.trim() === '') continue
      const mapped = mapper.mapLine(line)
      if (mapped.ignored) skippedLines += 1
      events.push(...mapped.events)
    }
    return { events, nextOffset: block.nextOffset, reachedEnd: block.reachedEnd, skippedLines }
  }
}

const errorCode = (error: unknown): unknown =>
  typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
const isMissing = (error: unknown): boolean => errorCode(error) === 'ENOENT'
const isNotDirectory = (error: unknown): boolean => errorCode(error) === 'ENOTDIR'
