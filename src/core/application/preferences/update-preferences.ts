import type { PreferencesRepository } from '../../domain/ports/preferences-repository'
import { updatePreferences, type Preferences } from '../../domain/preferences/preferences'

export class UpdatePreferences {
  constructor(private readonly repository: PreferencesRepository) {}

  async execute(changes: Partial<Preferences>): Promise<Preferences> {
    const updated = updatePreferences(await this.repository.load(), changes)
    await this.repository.save(updated)
    return updated
  }
}
