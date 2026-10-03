import { app } from 'electron'
import type { AppInfo, Platform } from '../../core/domain/app/app-info'
import type { AppMetadata } from '../../core/domain/ports/app-metadata'
import { DomainError } from '../../core/domain/errors'

const supportedPlatforms: readonly Platform[] = ['darwin', 'win32', 'linux']

export class ElectronAppMetadata implements AppMetadata {
  read(): AppInfo {
    const platform = supportedPlatforms.find((candidate) => candidate === process.platform)
    if (platform === undefined) {
      throw new DomainError('unsupported_platform', `Plateforme non prise en charge : ${process.platform}`)
    }
    return { version: app.getVersion(), platform }
  }
}
