import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('met en forme le gras, le code, les listes et les tableaux', () => {
    const html = renderMarkdown('**gras** et `code`\n\n- un\n- deux\n\n| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<strong>gras</strong>')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain('<li>un</li>')
    expect(html).toContain('<table>')
  })

  it('colore les blocs de code d’un langage connu, y compris par alias', () => {
    const html = renderMarkdown('```ts\nconst a = 1\n```')
    expect(html).toContain('<pre><code class="language-ts">')
    expect(html).toContain('<span class="hljs-keyword">const</span>')
    expect(renderMarkdown('```sh\necho ok\n```')).toContain('hljs-built_in')
  })

  it('laisse un bloc sans langage ou de langage inconnu en texte échappé', () => {
    expect(renderMarkdown('```\n<b>x</b>\n```')).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(renderMarkdown('```cobol\n<b>x</b>\n```')).toContain('&lt;b&gt;x&lt;/b&gt;')
  })

  it('échappe le HTML brut', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
  })

  it('n’affiche pas les images distantes et neutralise les liens dangereux', () => {
    expect(renderMarkdown('![x](https://exemple.fr/a.png)')).not.toContain('<img')
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('href="javascript')
  })

  it('marque les liens pour qu’ils s’ouvrent hors de l’app', () => {
    expect(renderMarkdown('[doc](https://exemple.fr)')).toContain('data-external="true"')
  })
})
