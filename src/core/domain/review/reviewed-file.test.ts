import { describe, expect, it } from 'vitest'
import { isReviewed, type ReviewedFile } from './reviewed-file'

const mark = (filePath: string, blob: string): ReviewedFile => ({
  id: filePath,
  providerId: 'claude',
  sessionExternalId: 's',
  filePath,
  blob,
  reviewedAt: '2026-10-04T12:00:00.000Z',
})

describe('fichiers relus', () => {
  it('vaut pour une version du fichier : modifié à nouveau, il redevient à relire', () => {
    const reviewed = [mark('a.ts', 'v1')]
    expect(isReviewed({ path: 'a.ts', blob: 'v1' }, reviewed)).toBe(true)
    expect(isReviewed({ path: 'a.ts', blob: 'v2' }, reviewed)).toBe(false)
    expect(isReviewed({ path: 'b.ts', blob: 'v1' }, reviewed)).toBe(false)
  })

  it('reconnaît un fichier sans version connue', () => {
    expect(isReviewed({ path: 'c.ts', blob: null }, [mark('c.ts', '')])).toBe(true)
  })
})
