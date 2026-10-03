import { existsSync } from 'node:fs'
import type { PathInspector } from '../../core/domain/ports/path-inspector'

export class NodePathInspector implements PathInspector {
  exists(path: string): boolean {
    return existsSync(path)
  }
}
