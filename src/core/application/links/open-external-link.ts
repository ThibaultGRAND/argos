import { DomainError } from '../../domain/errors'
import { isSafeExternalUrl } from '../../domain/links/external-link'
import type { ExternalLinkOpener } from '../../domain/ports/external-link-opener'

export class OpenExternalLink {
  constructor(private readonly opener: ExternalLinkOpener) {}

  async execute(url: string): Promise<void> {
    if (!isSafeExternalUrl(url)) throw new DomainError('unsafe_link', 'Lien refusé', { url })
    await this.opener.open(url)
  }
}
