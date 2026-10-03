import { describe, expect, it } from 'vitest'
import { AsyncQueue } from './async-queue'

describe('AsyncQueue', () => {
  it('délivre les éléments dans l’ordre, y compris ceux poussés pendant l’attente, puis se termine', async () => {
    const queue = new AsyncQueue<number>()
    queue.push(1)
    const received: number[] = []
    const reading = (async () => {
      for await (const item of queue) received.push(item)
    })()
    await Promise.resolve()
    queue.push(2)
    queue.close()
    queue.push(3)
    await reading
    expect(received).toEqual([1, 2])
  })
})
