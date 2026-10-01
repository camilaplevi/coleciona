const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

 get needsAuth(): boolean {
    return this.status === 401
  }

  get kind(): 'offline' | 'auth' | 'not-found' | 'conflict' | 'server' | 'client' {
    if (this.status === 0) return 'offline'
    if (this.status === 401) return 'auth'
    if (this.status === 404) return 'not-found'
    if (this.status === 409) return 'conflict'
    if (this.status >= 500) return 'server'
    return 'client'
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      // O token vai em cookie httpOnly, definido pela API no login.
      // Guardar token em localStorage deixa a sessão exposta a qualquer XSS.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch (error) {
    // AbortError sobe intacto: quem cancelou a requisição precisa distinguir
    // cancelamento de falha de rede, senão a tela pisca um erro à toa.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Não foi possível falar com o servidor. Verifique sua conexão.')
  }

  // depois
  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as { message?: unknown })

    // Só 4xx traz mensagem nossa, escrita em português para quem usa.
    // 5xx traz texto técnico ("Internal server error") que não ajuda ninguém.
    // O typeof cobre o ValidationPipe do Nest, que manda message como array.
    const message =
      response.status < 500 && typeof body.message === 'string'
        ? body.message
        : 'Não foi possível completar a ação. Tente de novo.'

    throw new ApiError(response.status, message)
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

/** Monta query string ignorando valores vazios. */
export function toQuery(params: Record<string, string | number | string[] | undefined>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','))
    } else {
      search.set(key, String(value))
    }
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}