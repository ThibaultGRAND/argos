import { describe, expect, it } from 'vitest'
import { planRead, type SourceFile } from './history-source'

const file: SourceFile = { providerId: 'claude', path: '/a.jsonl', sessionExternalId: 's', size: 100 }

describe('planRead', () => {
  it('lit un fichier jamais importé', () => {
    expect(planRead(file, undefined, 1)).toBe('resume')
  })

  it('ignore un fichier déjà lu jusqu’au bout', () => {
    expect(planRead(file, { sourcePath: '/a.jsonl', byteOffset: 100, fileSize: 100, parserVersion: 1 }, 1)).toBe('skip')
  })

  it('reprend un fichier qui a grandi', () => {
    expect(planRead(file, { sourcePath: '/a.jsonl', byteOffset: 60, fileSize: 60, parserVersion: 1 }, 1)).toBe('resume')
  })

  it('réimporte un fichier raccourci ou lu par une ancienne version du lecteur', () => {
    expect(
      planRead({ ...file, size: 40 }, { sourcePath: '/a.jsonl', byteOffset: 60, fileSize: 60, parserVersion: 1 }, 1),
    ).toBe('reimport')
    expect(planRead(file, { sourcePath: '/a.jsonl', byteOffset: 60, fileSize: 60, parserVersion: 1 }, 2)).toBe(
      'reimport',
    )
  })
})
