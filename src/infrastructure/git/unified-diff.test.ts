import { describe, expect, it } from 'vitest'
import { parseUnifiedDiff } from './unified-diff'

const limits = { maxLinesPerFile: 100, maxFiles: 10 }

const sample = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1111111111111111111111111111111111111111..2222222222222222222222222222222222222222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,3 +1,3 @@ function slug()',
  ' un',
  '-deux',
  '+DEUX',
  ' trois',
  'diff --git a/nouveau.md b/nouveau.md',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/nouveau.md',
  '@@ -0,0 +1,2 @@',
  '+a',
  '+b',
  '\\ No newline at end of file',
  'diff --git a/vieux.txt b/vieux.txt',
  'deleted file mode 100644',
  '--- a/vieux.txt',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-x',
  'diff --git a/img.png b/img.png',
  'Binary files a/img.png and b/img.png differ',
  'diff --git a/avant.ts b/après.ts',
  'similarity index 100%',
  'rename from avant.ts',
  'rename to après.ts',
  'diff --git "a/mon dossier/é\\303\\251.ts" "b/mon dossier/é\\303\\251.ts"',
  '--- "a/mon dossier/\\303\\251.ts"',
  '+++ "b/mon dossier/\\303\\251.ts"',
  '@@ -1 +1 @@',
  '-a',
  '+b',
  '',
].join('\n')

describe('parseUnifiedDiff', () => {
  const { files } = parseUnifiedDiff(sample, limits)

  it('lit les fichiers modifiés avec des numéros de ligne avant et après', () => {
    expect(files[0]).toMatchObject({
      path: 'src/a.ts',
      status: 'modified',
      additions: 1,
      deletions: 1,
      blob: '2222222222222222222222222222222222222222',
    })
    expect(files[1]?.blob).toBeNull()
    expect(files[0]?.hunks[0]).toMatchObject({ oldStart: 1, newStart: 1, section: 'function slug()' })
    expect(files[0]?.hunks[0]?.lines).toEqual([
      { type: 'context', oldNumber: 1, newNumber: 1, text: 'un' },
      { type: 'del', oldNumber: 2, newNumber: null, text: 'deux' },
      { type: 'add', oldNumber: null, newNumber: 2, text: 'DEUX' },
      { type: 'context', oldNumber: 3, newNumber: 3, text: 'trois' },
    ])
  })

  it('reconnaît les fichiers ajoutés, supprimés, binaires et renommés', () => {
    expect(files.slice(1).map((file) => [file.path, file.status, file.binary, file.oldPath])).toEqual([
      ['nouveau.md', 'added', false, null],
      ['vieux.txt', 'deleted', false, null],
      ['img.png', 'modified', true, null],
      ['après.ts', 'renamed', false, 'avant.ts'],
      ['mon dossier/é.ts', 'modified', false, null],
    ])
    expect(files[1]?.hunks[0]?.lines).toHaveLength(2)
  })

  it('coupe les fichiers trop longs et limite le nombre de fichiers', () => {
    const long = parseUnifiedDiff(sample, { maxLinesPerFile: 2, maxFiles: 2 })
    expect(long.files).toHaveLength(2)
    expect(long.truncated).toBe(true)
    expect(long.files[0]?.truncated).toBe(true)
    expect(long.files[0]?.hunks[0]?.lines).toHaveLength(2)
    expect(long.files[0]?.additions).toBe(1)
  })
})
