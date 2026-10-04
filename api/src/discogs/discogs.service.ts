import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { albumInclude, toAlbumSummary } from '../common/album.mapper.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { DiscogsApiError, DiscogsClient } from './discogs.client.js'
import {
  parseArtistDetail,
  toArtist,
  toArtistData,
  toReleaseSearchResults,
  toSearchResults,
  type DiscogsArtistSearchResult,
  type RawArtistResponse,
  type RawReleaseSearchResponse,
  type RawSearchResponse,
  type ReleaseSearchItem,
} from './discogs.mapper.js'
import { ReleaseImporter } from './release-importer.js'

/**
 * Cliente da API do Discogs. Só o backend fala com ele: sem CORS no browser, e o token não
 * pode ir ao bundle.
 */
@Injectable()
export class DiscogsService {
  private readonly client: DiscogsClient
  private readonly releases: ReleaseImporter

  constructor(private readonly prisma: PrismaService) {
    const token = process.env.DISCOGS_TOKEN
    const userAgent = process.env.DISCOGS_USER_AGENT

    // Falhar na subida: token ausente viraria "artista não encontrado" e esconderia o problema.
    if (!token || !userAgent) {
      throw new Error(
        'DISCOGS_TOKEN e DISCOGS_USER_AGENT precisam estar definidos no .env. ' +
          'O token pessoal é gerado em discogs.com/settings/developers.',
      )
    }

    this.client = new DiscogsClient(token, userAgent)
    this.releases = new ReleaseImporter(prisma)
  }

  async searchArtists(query: string): Promise<DiscogsArtistSearchResult[]> {
    const raw = await this.call(() =>
      this.client.get<RawSearchResponse>('/database/search', { q: query, type: 'artist', per_page: 20 }),
    )
    return toSearchResults(raw)
  }

  /** Busca discos de vinil. Não grava nada: quem grava é importRelease, ao escolher um. */
  async searchReleases(query: string, page: number): Promise<ReleaseSearchItem[]> {
    const raw = await this.call(() =>
      this.client.get<RawReleaseSearchResponse>('/database/search', {
        q: query,
        type: 'release',
        format: 'Vinyl',
        per_page: 20,
        page,
      }),
    )
    return toReleaseSearchResults(raw)
  }

  // Idempotente: se discogsId já existe, atualiza em vez de duplicar. Clique duplo não quebra.
  async importArtist(discogsId: number, userId: string) {
    const raw = await this.call(
      () => this.client.get<RawArtistResponse>(`/artists/${discogsId}`),
      'Artista não encontrado no Discogs.',
    )
    const data = toArtistData(parseArtistDetail(raw))

    const db = this.prisma.forUser(userId)
    const artist = await db.artist.upsert({
      where: { discogsId },
      create: data,
      update: data,
    })

    return toArtist(artist)
  }

  /** Grava o disco no catálogo e devolve o resumo local, pronto para a coleção. */
  async importRelease(discogsReleaseId: number, userId: string) {
    const albumId = await this.call(
      () => this.releases.import(this.client, discogsReleaseId, userId),
      'Disco não encontrado no Discogs.',
    )

    const album = await this.prisma.album.findUniqueOrThrow({
      where: { id: albumId },
      include: albumInclude,
    })
    return toAlbumSummary(album)
  }

  /** Converte erro da API do Discogs em resposta HTTP. Erro de banco segue sem tratamento. */
  private async call<T>(run: () => Promise<T>, notFoundMessage?: string): Promise<T> {
    try {
      return await run()
    } catch (error) {
      if (error instanceof DiscogsApiError) {
        if (error.status === 404) {
          throw new NotFoundException(notFoundMessage ?? 'Não encontrado no Discogs.')
        }
        if (error.status === 429) {
          throw new ServiceUnavailableException(
            'Muitas requisições ao Discogs agora. Tente de novo em alguns segundos.',
          )
        }
        throw new BadGatewayException('Não foi possível falar com o Discogs agora.')
      }
      throw error
    }
  }
}
