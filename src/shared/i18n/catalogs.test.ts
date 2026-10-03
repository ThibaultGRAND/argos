import { describe, expect, it } from 'vitest'
import en from './en.json'
import fr from './fr.json'

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
}

describe('catalogues de traduction', () => {
  it('le français et l’anglais ont exactement les mêmes clés', () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(fr).sort())
  })

  it('aucune traduction n’est vide', () => {
    const empty = (catalog: unknown) =>
      flattenKeys(catalog).filter((key) => {
        const text = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], catalog)
        return typeof text !== 'string' || text.trim() === ''
      })
    expect(empty(fr)).toEqual([])
    expect(empty(en)).toEqual([])
  })
})
