import type { PreferencesRepository } from '../../domain/ports/preferences-repository'
import type { Preferences } from '../../domain/preferences/preferences'

export class GetPreferences {
  constructor(private readonly repository: PreferencesRepository) {}

  execute(): Promise<Preferences> {
    return this.repository.load()
  }
}
