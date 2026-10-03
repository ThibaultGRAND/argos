import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import en from './en.json'
import fr from './fr.json'

const rendererDirectory = resolve(__dirname, '../../renderer')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(vue|ts)$/.test(name) && !name.endsWith('.test.ts') ? [path] : []
  })
}

function resolves(catalog: unknown, key: string): boolean {
  let node: unknown = catalog
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null || !(part in node)) return false
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string'
}

describe('clés de traduction utilisées par l’interface', () => {
  // Clés écrites en toutes lettres : `t('…')` ou `$t('…')`. Les clés construites dynamiquement ne sont pas vérifiées ici.
  const keys = new Set(
    sourceFiles(rendererDirectory).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/\$?\bt\('([a-zA-Z0-9_.]+)'/g)].map((match) => match[1] ?? ''),
    ),
  )

  it('trouve des clés à vérifier', () => {
    expect(keys.size).toBeGreaterThan(10)
  })

  it('chaque clé existe en français et en anglais', () => {
    const missing = [...keys].filter((key) => !resolves(fr, key) || !resolves(en, key))
    expect(missing).toEqual([])
  })
})
