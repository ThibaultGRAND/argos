import { describe, expect, it } from 'vitest'
import { IntlifyTranslator } from './intlify-translator'

describe('IntlifyTranslator', () => {
  it('traduit avec les catalogues partagés, dans la langue demandée', () => {
    const translator = new IntlifyTranslator()
    expect(translator.translate('fr', 'notifications.permission.title', {})).toBe('Claude attend ta permission')
    expect(translator.translate('en', 'notifications.turnCompleted.body', { session: 'X', seconds: 12 })).toContain(
      '12',
    )
  })
})
