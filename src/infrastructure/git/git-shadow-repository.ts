import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import type { ShadowCommit, ShadowRepository } from '../../core/domain/ports/shadow-repository'
import type { CommitStats } from '../../core/domain/snapshots/snapshot'
import { DomainError } from '../../core/domain/errors'

/** Arbre vide de git : point de comparaison du tout premier snapshot. */
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'

/** Exclusions d'Argos, en plus du `.gitignore` du projet (dossiers générés, dépendances, fichiers système). */
const DEFAULT_EXCLUDES = [
  'node_modules/',
  'dist/',
  'out/',
  'build/',
  '.next/',
  '.nuxt/',
  '.svelte-kit/',
  '.astro/',
  '.turbo/',
  '.cache/',
  'coverage/',
  'target/',
  '__pycache__/',
  '.venv/',
  'venv/',
  '.DS_Store',
  'Thumbs.db',
]

export interface GitShadowOptions {
  /** Dossier des dépôts fantômes (`<données d'Argos>/shadow-git`). */
  readonly root: string
  /** Environnement du shell, pour trouver git. */
  readonly environment: NodeJS.ProcessEnv
  /** Taille au-delà de laquelle un fichier n'est pas capturé. */
  readonly maxFileBytes?: number
}

/**
 * Dépôt git fantôme d'un projet (F06, PLAN.md §2.4) : git du système, `--git-dir` séparé et `--work-tree` sur le projet.
 * Le `.git` du projet n'est jamais lu ni écrit.
 */
export class GitShadowRepository implements ShadowRepository {
  private available: Promise<boolean> | undefined
  private readonly maxFileBytes: number

  constructor(private readonly options: GitShadowOptions) {
    this.maxFileBytes = options.maxFileBytes ?? 5 * 1024 * 1024
  }

  isAvailable(): Promise<boolean> {
    this.available ??= this.run(undefined, ['--version'], process.cwd())
      .then(() => true)
      .catch((error: unknown) => {
        if (error instanceof Error) return false
        throw error
      })
    return this.available
  }

  async snapshot(projectPath: string, message: string): Promise<ShadowCommit> {
    await this.ensureRepository(projectPath)
    const parent = await this.head(projectPath)

    const exclusions = (await this.largeFiles(projectPath)).map((path) => `:(exclude,literal)${path}`)
    await this.git(projectPath, ['add', '--all', '--', '.', ...exclusions])
    await this.git(projectPath, ['commit', '--allow-empty', '--no-verify', '--quiet', '-m', message])
    const commitHash = await this.head(projectPath)
    if (commitHash === null) throw new DomainError('snapshot_failed', 'Snapshot impossible', { projectPath })

    return {
      commitHash,
      parentCommitHash: parent,
      stats: await this.stats(projectPath, parent ?? EMPTY_TREE, commitHash),
    }
  }

  async restore(projectPath: string, commitHash: string): Promise<void> {
    // Fichiers créés depuis la cible : présents dans l'état actuel capturé (HEAD), absents de la cible.
    const added = (await this.git(projectPath, ['diff', '--name-only', '-z', '--diff-filter=A', commitHash, 'HEAD']))
      .split('\0')
      .filter((path) => path !== '')
    const root = resolve(projectPath)
    for (const path of added) {
      const absolute = resolve(root, path)
      // Garde-fou : jamais de suppression en dehors du projet.
      if (relative(root, absolute).startsWith('..')) continue
      await rm(absolute, { force: true })
    }
    // Contenu des fichiers modifiés ou supprimés depuis la cible.
    await this.git(projectPath, ['restore', `--source=${commitHash}`, '--worktree', '--', '.'])
  }

  private gitDirectory(projectPath: string): string {
    const key = createHash('sha256').update(resolve(projectPath)).digest('hex').slice(0, 16)
    return join(this.options.root, `${key}.git`)
  }

  private async ensureRepository(projectPath: string): Promise<void> {
    if (!(await this.isAvailable())) throw new DomainError('git_unavailable', 'git est introuvable')
    if (!existsSync(projectPath))
      throw new DomainError('project_missing', 'Dossier du projet introuvable', { projectPath })
    const directory = this.gitDirectory(projectPath)
    if (existsSync(join(directory, 'HEAD'))) return

    mkdirSync(this.options.root, { recursive: true })
    await this.git(projectPath, ['init', '--quiet'])
    for (const [key, value] of [
      ['core.autocrlf', 'false'],
      ['core.quotepath', 'false'],
      ['core.longpaths', 'true'],
      ['commit.gpgsign', 'false'],
      ['user.name', 'Argos'],
      ['user.email', 'argos@localhost'],
      ['gc.auto', '256'],
    ] as const) {
      await this.git(projectPath, ['config', key, value])
    }
    mkdirSync(join(directory, 'info'), { recursive: true })
    writeFileSync(join(directory, 'info', 'exclude'), `${DEFAULT_EXCLUDES.join('\n')}\n`)
  }

  private async head(projectPath: string): Promise<string | null> {
    try {
      return (await this.git(projectPath, ['rev-parse', '--verify', '--quiet', 'HEAD'])).trim() || null
    } catch (error) {
      // Dépôt sans commit : pas encore de HEAD.
      if (error instanceof Error) return null
      throw error
    }
  }

  /** Fichiers non suivis ou modifiés trop gros pour être capturés. */
  private async largeFiles(projectPath: string): Promise<string[]> {
    const candidates = (await this.git(projectPath, ['ls-files', '-z', '--others', '--modified', '--exclude-standard']))
      .split('\0')
      .filter((path) => path !== '')
    return candidates.filter((path) => {
      try {
        return statSync(join(projectPath, path)).size > this.maxFileBytes
      } catch (error) {
        if (error instanceof Error) return false
        throw error
      }
    })
  }

  private async stats(projectPath: string, from: string, to: string): Promise<CommitStats> {
    const output = await this.git(projectPath, ['diff', '--numstat', '-z', from, to])
    let filesChanged = 0
    let linesAdded = 0
    let linesRemoved = 0
    // Format -z : « ajoutées\tsupprimées\tchemin\0 » ; « - » pour un fichier binaire.
    for (const record of output.split('\0')) {
      const match = /^(\d+|-)\t(\d+|-)\t/.exec(record)
      if (match === null) continue
      filesChanged += 1
      linesAdded += match[1] === '-' ? 0 : Number(match[1])
      linesRemoved += match[2] === '-' ? 0 : Number(match[2])
    }
    return { filesChanged, linesAdded, linesRemoved }
  }

  private git(projectPath: string, args: readonly string[]): Promise<string> {
    return this.run(this.gitDirectory(projectPath), ['--work-tree', projectPath, ...args], projectPath)
  }

  private run(gitDirectory: string | undefined, args: readonly string[], cwd: string): Promise<string> {
    const fullArgs = gitDirectory === undefined ? [...args] : ['--git-dir', gitDirectory, ...args]
    return new Promise((resolvePromise, reject) => {
      execFile(
        'git',
        fullArgs,
        { cwd, env: { ...this.options.environment, GIT_TERMINAL_PROMPT: '0' }, maxBuffer: 64 * 1024 * 1024 },
        (error, stdout) => (error === null ? resolvePromise(stdout) : reject(error)),
      )
    })
  }
}
