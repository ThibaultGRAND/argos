import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { LiveEvent } from '../../../core/domain/live/live-events'
import { findClaudeExecutable } from '../../system/claude-executable'
import { loadShellEnvironment } from '../../system/shell-environment'
import { ClaudeAgentRuntime } from './claude-agent-runtime'

/**
 * Test de bout en bout avec un vrai agent Claude, dans un dossier temporaire.
 * Désactivé par défaut (il consomme du quota) : `ARGOS_SMOKE=1 npx vitest run claude-agent-runtime.smoke`.
 */
describe.skipIf(process.env['ARGOS_SMOKE'] !== '1')('ClaudeAgentRuntime (agent réel)', () => {
  it('démarre une session, demande la permission d’écrire, écrit le fichier et termine le tour', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'argos-smoke-'))
    const environment = await loadShellEnvironment()
    const runtime = new ClaudeAgentRuntime({ executable: findClaudeExecutable(environment), environment })
    const events: LiveEvent[] = []

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Délai dépassé')), 120_000)
        const run = runtime.start({ cwd: directory, model: 'haiku' }, (event) => {
          events.push(event)
          if (event.type === 'permission-requested') run.answerPermission(event.request.requestId, 'allow')
          if (event.type === 'turn-completed') {
            clearTimeout(timer)
            run.stop()
            resolve()
          }
        })
        run.send(
          'Crée un fichier hello.txt contenant exactement OK (sans retour à la ligne), puis réponds seulement FINI.',
        )
      })

      const types = events.map((event) => event.type)
      expect(types).toContain('identified')
      expect(types).toContain('tool-call')
      expect(types).toContain('turn-completed')
      expect(readFileSync(join(directory, 'hello.txt'), 'utf8').trim()).toBe('OK')
      console.log('Permissions demandées :', events.filter((event) => event.type === 'permission-requested').length)
      console.log('Types d’événements :', [...new Set(types)].join(', '))
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 150_000)
})
