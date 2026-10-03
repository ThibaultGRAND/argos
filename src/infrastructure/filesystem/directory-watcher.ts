import { watch, type FSWatcher } from 'node:fs'

/**
 * Surveille un dossier et ses sous-dossiers ; `onChange` est appelé après une période de calme (anti-rebond).
 * Si le dossier n'existe pas ou ne peut pas être surveillé, renvoie `undefined` : le passage périodique prend le relais.
 */
export function watchDirectory(
  path: string,
  debounceMs: number,
  onChange: () => void,
  onError: (error: Error) => void,
): { close(): void } | undefined {
  let watcher: FSWatcher
  try {
    watcher = watch(path, { recursive: true, persistent: false })
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)))
    return undefined
  }

  let timer: NodeJS.Timeout | undefined
  watcher.on('change', () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(onChange, debounceMs)
  })
  watcher.on('error', onError)
  return {
    close: () => {
      if (timer !== undefined) clearTimeout(timer)
      watcher.close()
    },
  }
}
