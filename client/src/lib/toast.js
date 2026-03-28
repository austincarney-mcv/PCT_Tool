const listeners = new Set()

/** Subscribe to toast events. Returns an unsubscribe function. */
export function onToast(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Fire a toast. Call this from anywhere (QueryClient callbacks, etc.). */
export function showToast(msg = 'Saved') {
  listeners.forEach(fn => fn(msg))
}
