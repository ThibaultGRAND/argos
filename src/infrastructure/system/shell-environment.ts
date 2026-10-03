import { execFile } from 'node:child_process'

const MARKER = '__ARGOS_ENV_START__'
const TIMEOUT_MS = 5_000

/**
 * Variables d'environnement du shell de connexion de l'utilisateur (macOS, Linux).
 * Une app lancée depuis le Finder n'hérite pas du PATH du terminal : sans ça, l'agent ne trouverait ni `npm` ni `git`.
 * En cas d'échec, l'environnement du processus est renvoyé tel quel.
 */
export async function loadShellEnvironment(
  base: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Promise<NodeJS.ProcessEnv> {
  if (platform === 'win32') return { ...base }
  const shell = base['SHELL'] ?? '/bin/zsh'
  try {
    const output = await new Promise<string>((resolve, reject) => {
      execFile(
        shell,
        ['-ilc', `printf '${MARKER}'; env -0`],
        { timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, env: base },
        (error, stdout) => (error === null ? resolve(stdout) : reject(error)),
      )
    })
    return { ...base, ...parseEnvironment(output) }
  } catch (error) {
    if (error instanceof Error) return { ...base }
    throw error
  }
}

/** Lit la sortie de `env -0` placée après le marqueur (le shell peut afficher autre chose avant). */
export function parseEnvironment(output: string): Record<string, string> {
  const start = output.indexOf(MARKER)
  if (start === -1) return {}
  const variables: Record<string, string> = {}
  for (const entry of output.slice(start + MARKER.length).split('\0')) {
    const separator = entry.indexOf('=')
    if (separator > 0) variables[entry.slice(0, separator)] = entry.slice(separator + 1)
  }
  return variables
}
