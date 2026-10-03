import type { AppInfo } from '../../domain/app/app-info'
import type { AppMetadata } from '../../domain/ports/app-metadata'

export class GetAppInfo {
  constructor(private readonly metadata: AppMetadata) {}

  execute(): AppInfo {
    return this.metadata.read()
  }
}
