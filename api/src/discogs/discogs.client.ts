import axios, { AxiosError, type AxiosInstance } from 'axios'

export class DiscogsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'DiscogsApiError'
  }
}

/**
 * Chamadas à API do Discogs com ritmo controlado. Com token pessoal o limite
 * é de 60 requisições por minuto: as chamadas passam em fila, espaçadas, e um
 * 429 espera o Retry-After antes de tentar de novo uma vez.
 */
export class DiscogsClient {
  private readonly http: AxiosInstance
  private queue: Promise<unknown> = Promise.resolve()
  private lastCallAt = 0

  constructor(
    token: string,
    userAgent: string,
    private readonly minIntervalMs = 1100,
  ) {
    this.http = axios.create({
      baseURL: 'https://api.discogs.com',
      timeout: 10_000,
      headers: { Authorization: `Discogs token=${token}`, 'User-Agent': userAgent },
    })
  }

  get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const task = this.queue.then(() => this.send<T>(path, params))
    this.queue = task.catch(() => undefined)
    return task
  }

  private async send<T>(path: string, params?: Record<string, string | number>, retried = false): Promise<T> {
    const wait = this.lastCallAt + this.minIntervalMs - Date.now()
    if (wait > 0) await sleep(wait)
    this.lastCallAt = Date.now()

    try {
      const response = await this.http.get<T>(path, { params })
      return response.data
    } catch (error) {
      if (!(error instanceof AxiosError)) throw error

      const status = error.response?.status ?? 0
      if (status === 429 && !retried) {
        const retryAfter = Number(error.response?.headers['retry-after'] ?? 60)
        await sleep(retryAfter * 1000)
        return this.send<T>(path, params, true)
      }
      throw new DiscogsApiError(status, error.message)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
