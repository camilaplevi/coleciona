// web/src/composables/useAsync.ts

import { ref, shallowRef } from 'vue'

/**
 * Estado de uma chamada assíncrona: dados, carregando e erro, com
 * cancelamento da requisição anterior.
 *
 * O cancelamento importa mais do que parece na busca: digitar "coltrane"
 * dispara oito requisições, e sem AbortController a resposta de "colt" pode
 * chegar depois da de "coltrane" e sobrescrever o resultado certo.
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>) {
  const data = shallowRef<T | null>(null)
  const error = ref<string | null>(null)
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
      error.value = cause instanceof Error ? cause.message : 'Algo deu errado.'
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }

  return { data, error, loading, run }
}