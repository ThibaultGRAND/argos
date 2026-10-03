import MarkdownIt from 'markdown-it'
import { highlightCode } from './code-highlight'

/**
 * Rendu Markdown des réponses de l'agent, comme dans Claude.
 * Sécurité : HTML brut désactivé (échappé), images désactivées (aucun contenu distant),
 * liens limités par markdown-it aux protocoles sûrs ; leur ouverture passe par le processus principal.
 */
const renderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
  // Une chaîne vide laisse markdown-it échapper le code lui-même (langage inconnu ou absent).
  highlight: (code, language) => highlightCode(code, language) ?? '',
}).disable('image')

const defaultLinkOpen =
  renderer.renderer.rules['link_open'] ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))

// Les liens ne naviguent jamais dans la fenêtre : l'interface intercepte le clic et demande leur ouverture.
renderer.renderer.rules['link_open'] = (tokens, index, options, env, self) => {
  tokens[index]?.attrSet('data-external', 'true')
  return defaultLinkOpen(tokens, index, options, env, self)
}

export function renderMarkdown(text: string): string {
  return renderer.render(text)
}
