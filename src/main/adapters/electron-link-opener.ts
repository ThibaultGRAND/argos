import { shell } from 'electron'
import type { ExternalLinkOpener } from '../../core/domain/ports/external-link-opener'

export class ElectronLinkOpener implements ExternalLinkOpener {
  open(url: string): Promise<void> {
    return shell.openExternal(url)
  }
}
