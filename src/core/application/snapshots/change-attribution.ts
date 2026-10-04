import type { ShadowRepository } from '../../domain/ports/shadow-repository'
import type { FileDiff } from '../../domain/review/diff'
import { attributeFiles, type AttributedFile, type Interval, type TurnChange } from '../../domain/snapshots/snapshot'

export interface AttributedChanges {
  readonly agent: readonly AttributedFile<FileDiff>[]
  readonly other: readonly FileDiff[]
}

/**
 * Attribution des fichiers modifiés : travail de l'agent (ses tours) ou autres modifications (entre ses tours).
 * Les chemins modifiés entre deux captures ne changent jamais : ils sont gardés en mémoire.
 */
export class ChangeAttribution {
  private readonly cache = new Map<string, Promise<readonly string[]>>()

  constructor(private readonly shadow: ShadowRepository) {}

  async attribute(
    files: readonly FileDiff[],
    turns: readonly TurnChange[],
    outside: readonly Interval[],
  ): Promise<AttributedChanges> {
    const [agentPaths, outsidePaths] = await Promise.all([
      this.pathsOf(turns.map((turn) => ({ from: turn.before, to: turn.snapshot }))),
      this.pathsOf(outside),
    ])
    return attributeFiles(files, agentPaths, outsidePaths)
  }

  private async pathsOf(intervals: readonly Interval[]): Promise<ReadonlySet<string>> {
    const lists = await Promise.all(intervals.map((interval) => this.changedPaths(interval)))
    return new Set(lists.flat())
  }

  private changedPaths({ from, to }: Interval): Promise<readonly string[]> {
    const key = `${from.commitHash}..${to.commitHash}`
    let paths = this.cache.get(key)
    if (paths === undefined) {
      paths = this.shadow.changedPaths(to.projectPath, from.commitHash, to.commitHash)
      // Un échec n'est pas mémorisé : la prochaine lecture réessaiera.
      paths.catch(() => this.cache.delete(key))
      this.cache.set(key, paths)
    }
    return paths
  }
}
