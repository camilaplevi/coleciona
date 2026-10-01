// web/src/composables/useAsync.ts

import { ref, shallowRef } from 'vue'

export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>) {
  const data = shallowRef<T | null>(null)
  const error = shallowRef<unknown>(null)
  const loading = ref(false)

  let controller: AbortController | null = null

  async function run(): Promise<void> {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    loading.value = true
    error.value = null

    try {
      const result = await fn(signal)
      if (signal.aborted) return
      data.value = result
    } catch (cause) {
      if (signal.aborted) return
      error.value = cause 
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }

  return { data, error, loading, run }
}