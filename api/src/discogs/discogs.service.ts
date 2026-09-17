// api/src/discogs/discogs.service.ts

import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import axios, { AxiosError, type AxiosInstance } from 'axios'
import { PrismaService } from '../prisma/prisma.service.js'
import {
  parseArtistDetail,
  toArtist,
  toArtistData,
  toSearchResults,
  type DiscogsArtistSearchResult,
  type RawArtistResponse,
  type RawSearchResponse,
} from './discogs.mapper.js'

/**
 * Cliente da API do Discogs e ponte com o catálogo local.
 *
 * Consumido só pelo backend, nunca pelo navegador: o Discogs não manda CORS
 * pra uso direto no browser, e o token pessoal não pode ir pro bundle. Ver a
 * seção "Decisões técnicas" do README.
 */
@Injectable()
export class DiscogsService {
  private readonly http: AxiosInstance

  constructor(private readonly prisma: PrismaService) {
    const token = process.env.DISCOGS_TOKEN
    const userAgent = process.env.DISCOGS_USER_AGENT

    // Falha já na subida do app, não na primeira busca de alguém: um token
    // ausente aqui vira "artista não encontrado" mais adiante, e isso
    // esconde o problema real.
    if (!token || !userAgent) {
      throw new Error(
        'DISCOGS_TOKEN e DISCOGS_USER_AGENT precisam estar definidos no .env. ' +
          'O token pessoal é gerado em discogs.com/settings/developers.',
      )
    }

    this.http = axios.create({
      baseURL: 'https://api.discogs.com',
      timeout: 8000,
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': userAgent,
      },
    })
  }

  /** Busca artistas por nome. Não grava nada — só proxy normalizado. */
  async searchArtists(query: string): Promise<DiscogsArtistSearchResult[]> {
    const raw = await this.request<RawSearchResponse>(() =>
      this.http.get('/database/search', {
        params: { q: query, type: 'artist', per_page: 20 },
      }),
    )
    return toSearchResults(raw)
  }

  /**
   * Importa um artista pro catálogo local. Idempotente: se `discogsId` já
   * existe em `artists`, atualiza os dados em vez de duplicar — é assim que
   * clicar duas vezes no mesmo resultado de busca não quebra nada.
   */
  async importArtist(discogsId: number, userId: string) {
    const raw = await this.request<RawArtistResponse>(() => this.http.get(`/artists/${discogsId}`), {
      notFoundMessage: 'Artista não encontrado no Discogs.',
    })
    const detail = parseArtistDetail(raw)
    const data = toArtistData(detail)

    const db = this.prisma.forUser(userId)
    const artist = await db.artist.upsert({
      where: { discogsId },
      create: data,
      update: data,
    })

    return toArtist(artist)
  }

  private async request<T>(
    call: () => Promise<{ data: T }>,
    options?: { notFoundMessage?: string },
  ): Promise<T> {
    try {
      const response = await call()
      return response.data
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          throw new NotFoundException(options?.notFoundMessage ?? 'Não encontrado no Discogs.')
        }
        if (error.response?.status === 429) {
          throw new ServiceUnavailableException(
            'Muitas requisições ao Discogs agora. Tente de novo em alguns segundos.',
          )
        }
      }
      throw new BadGatewayException('Não foi possível falar com o Discogs agora.')
    }
  }
}
