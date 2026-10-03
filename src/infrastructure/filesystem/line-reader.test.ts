import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readLines } from './line-reader'

describe('readLines', () => {
  let directory: string
  let file: string

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'argos-lines-'))
    file = join(directory, 'f.jsonl')
  })

  afterEach(() => rmSync(directory, { recursive: true, force: true }))

  it('lit les lignes complètes et ignore une ligne en cours d’écriture', async () => {
    writeFileSync(file, 'un\ndeux\ntro')
    const block = await readLines(file, 0, 1024)
    expect(block.lines).toEqual(['un', 'deux'])
    expect(block.nextOffset).toBe(8)
    expect(block.reachedEnd).toBe(false)
  })

  it('reprend à une position donnée et gère les caractères multi-octets', async () => {
    writeFileSync(file, 'é\nà\n')
    const first = await readLines(file, 0, 3)
    expect(first.lines).toEqual(['é'])
    const second = await readLines(file, first.nextOffset, 1024)
    expect(second.lines).toEqual(['à'])
    expect(second.reachedEnd).toBe(true)
  })

  it('lit une ligne plus longue que le tampon', async () => {
    writeFileSync(file, `${'x'.repeat(5000)}\nfin\n`)
    const block = await readLines(file, 0, 100)
    expect(block.lines[0]).toBe('x'.repeat(5000))
  })

  it('accepte les fins de ligne Windows', async () => {
    writeFileSync(file, 'a\r\nb\r\n')
    expect((await readLines(file, 0, 1024)).lines).toEqual(['a', 'b'])
  })
})
