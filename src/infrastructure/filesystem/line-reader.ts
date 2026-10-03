import { open } from 'node:fs/promises'

const NEWLINE = 0x0a

export interface LineBlock {
  /** Lignes complètes, sans le caractère de fin de ligne. */
  readonly lines: readonly string[]
  /** Position juste après la dernière ligne complète. */
  readonly nextOffset: number
  readonly reachedEnd: boolean
}

/**
 * Lit les lignes complètes d'un fichier à partir d'une position en octets, environ `maxBytes` à la fois.
 * Une ligne en cours d'écriture (sans fin de ligne) n'est jamais renvoyée : elle sera lue au passage suivant.
 * Une ligne plus longue que `maxBytes` est lue en entier en agrandissant le tampon.
 */
export async function readLines(path: string, fromOffset: number, maxBytes: number): Promise<LineBlock> {
  const handle = await open(path, 'r')
  try {
    const { size } = await handle.stat()
    let length = Math.min(maxBytes, size - fromOffset)
    if (length <= 0) return { lines: [], nextOffset: fromOffset, reachedEnd: true }

    for (;;) {
      const buffer = Buffer.alloc(length)
      const { bytesRead } = await handle.read(buffer, 0, length, fromOffset)
      const lastNewline = buffer.lastIndexOf(NEWLINE, bytesRead - 1)
      const atEndOfFile = fromOffset + bytesRead >= size

      if (lastNewline === -1) {
        // Aucune ligne complète dans le tampon : ligne plus longue que le tampon, ou ligne en cours d'écriture.
        if (atEndOfFile) return { lines: [], nextOffset: fromOffset, reachedEnd: true }
        length = Math.min(length * 2, size - fromOffset)
        continue
      }

      const text = buffer.subarray(0, lastNewline).toString('utf8')
      const nextOffset = fromOffset + lastNewline + 1
      return {
        lines: text.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line)),
        nextOffset,
        reachedEnd: nextOffset >= size,
      }
    }
  } finally {
    await handle.close()
  }
}
