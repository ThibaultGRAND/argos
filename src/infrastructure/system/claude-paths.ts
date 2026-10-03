import { homedir } from 'node:os'
import { join } from 'node:path'

/** Dossier des sessions de Claude Code : `CLAUDE_CONFIG_DIR` s'il est défini, sinon `~/.claude`. */
export function resolveClaudeProjectsDirectory(environment: NodeJS.ProcessEnv = process.env): string {
  const configured = environment['CLAUDE_CONFIG_DIR']
  const base = configured !== undefined && configured.trim() !== '' ? configured : join(homedir(), '.claude')
  return join(base, 'projects')
}
