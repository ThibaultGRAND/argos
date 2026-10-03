import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

/**
 * Coloration syntaxique des blocs de code (highlight.js, langages courants seulement pour garder un bundle léger).
 * Les couleurs viennent des tokens C1 (styles/code.css), en thème sombre comme en clair.
 */
const languages = {
  bash,
  css,
  diff,
  dockerfile,
  go,
  ini,
  java,
  javascript,
  json,
  markdown,
  php,
  python,
  rust,
  scss,
  shell,
  sql,
  typescript,
  xml,
  yaml,
}
for (const [name, definition] of Object.entries(languages)) hljs.registerLanguage(name, definition)

/** Noms courants écrits après ``` qui ne sont pas des noms highlight.js. */
const aliases: Readonly<Record<string, string>> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  sh: 'bash',
  zsh: 'bash',
  console: 'shell',
  py: 'python',
  rs: 'rust',
  yml: 'yaml',
  md: 'markdown',
  html: 'xml',
  vue: 'xml',
  astro: 'xml',
  svg: 'xml',
  toml: 'ini',
  docker: 'dockerfile',
  jsonc: 'json',
}

/** Bloc de code coloré (HTML échappé par highlight.js), ou `undefined` si le langage est inconnu ou absent. */
export function highlightCode(code: string, language: string): string | undefined {
  const name = language.trim().toLowerCase()
  if (name === '') return undefined
  const resolved = aliases[name] ?? name
  if (hljs.getLanguage(resolved) === undefined) return undefined
  return hljs.highlight(code, { language: resolved, ignoreIllegals: true }).value
}
