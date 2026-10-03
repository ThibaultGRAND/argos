import { statSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'

/**
 * Chemin de la CLI `claude` installée : d'abord dans le PATH (du shell de connexion), puis dans les emplacements
 * habituels de l'installateur officiel, de Homebrew et de npm. `undefined` si elle est introuvable.
 */
export function findClaudeExecutable(
  environment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string | undefined {
  const names = platform === 'win32' ? ['claude.exe', 'claude.cmd'] : ['claude']
  const pathDirectories = (environment['PATH'] ?? environment['Path'] ?? '')
    .split(delimiter)
    .filter((dir) => dir !== '')
  const usualDirectories =
    platform === 'win32'
      ? [join(home, '.local', 'bin'), join(environment['APPDATA'] ?? join(home, 'AppData', 'Roaming'), 'npm')]
      : [join(home, '.local', 'bin'), join(home, '.claude', 'local'), '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']

  for (const directory of [...pathDirectories, ...usualDirectories]) {
    for (const name of names) {
      const candidate = join(directory, name)
      if (isFile(candidate)) return candidate
    }
  }
  return undefined
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch (error) {
    if (error instanceof Error) return false
    throw error
  }
}
