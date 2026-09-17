// api/src/catalog/catalog.service.ts

import { Injectable } from '@nestjs/common'
import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { albumInclude, toAlbumSummary } from '../common/album.mapper.js'

export interface AlbumQuery {
  search?: string
  styleSlugs: string[]
  decades: number[]
  label?: string
  sort: 'album-az' | 'ano-desc' | 'recentes'
  page: number
  perPage: number
}

/** Quantos discos cada seção da home mostra. */
const SECTION_SIZE = 5

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Conteúdo da página inicial: um destaque e uma faixa por estilo.
   *
   * `viewerId` é null para visitante não autenticado — a leitura do catálogo
   * é livre, então a página funciona sem login. O que muda com sessão é só
   * `ownedAlbumIds`, que diz quais cards já entram marcados.
   */
  async home(viewerId: string | null) {
    const db = this.prisma.forUser(viewerId)

    const styles = await db.style.findMany({ orderBy: { name: 'asc' } })

    const sections = await Promise.all(
      styles.map(async (style) => ({
        style: { id: style.id, slug: style.slug, name: style.name },
        albums: (
          await db.album.findMany({
            where: { styles: { some: { styleId: style.id } } },
            include: albumInclude,
            orderBy: { sortTitle: 'asc' },
            take: SECTION_SIZE,
          })
        ).map(toAlbumSummary),
      })),
    )

    // O destaque é o disco mais recente do catálogo. Quando houver curadoria
    // de verdade, isto vira uma flag na tabela — por ora, "o último que
    // entrou" é uma regra honesta e não exige campo novo.
    const [featuredRow] = await db.album.findMany({
      include: albumInclude,
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    const populated = sections.filter((section) => section.albums.length > 0)
    const albumIds = [
      ...new Set([
        ...populated.flatMap((s) => s.albums.map((a) => a.id)),
        ...(featuredRow ? [featuredRow.id] : []),
      ]),
    ]

    return {
      featured: featuredRow ? toAlbumSummary(featuredRow) : null,
      sections: populated,
      ownedAlbumIds: await this.ownedAmong(viewerId, albumIds),
    }
  }

  /** Listagem com busca e filtros. Alimenta a tela de resultados. */
  async list(query: AlbumQuery, viewerId: string | null) {
    const db = this.prisma.forUser(viewerId)
    const where = this.buildWhere(query)

    const [rows, total] = await Promise.all([
      db.album.findMany({
        where,
        include: albumInclude,
        orderBy: this.buildOrderBy(query.sort),
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      db.album.count({ where }),
    ])

    const items = rows.map(toAlbumSummary)

    return {
      items,
      total,
      page: query.page,
      perPage: query.perPage,
      ownedAlbumIds: await this.ownedAmong(
        viewerId,
        items.map((item) => item.id),
      ),
    }
  }

  /**
   * Quais destes álbuns já estão na coleção de quem está olhando.
   *
   * Vem numa lista separada em vez de virar um campo do álbum porque
   * "estar na coleção" é uma relação entre disco e pessoa, não um atributo do
   * disco — e o mesmo AlbumSummary serve para visitante, dono e perfil alheio.
   */
  private async ownedAmong(viewerId: string | null, albumIds: string[]): Promise<string[]> {
    if (!viewerId || albumIds.length === 0) return []

    const db = this.prisma.forUser(viewerId)
    const items = await db.collectionItem.findMany({
      where: { ownerId: viewerId, albumId: { in: albumIds } },
      select: { albumId: true },
    })

    return items.map((item) => item.albumId)
  }

  private buildWhere(query: AlbumQuery): Prisma.AlbumWhereInput {
    const conditions: Prisma.AlbumWhereInput[] = []

    if (query.search) {
      const contains = query.search
      // Um campo de busca só, atravessando álbum, gravadora e artista.
      conditions.push({
        OR: [
          { title: { contains, mode: 'insensitive' } },
          { label: { contains, mode: 'insensitive' } },
          { artists: { some: { artist: { name: { contains, mode: 'insensitive' } } } } },
        ],
      })
    }

    if (query.label) conditions.push({ label: query.label })

    if (query.styleSlugs.length) {
      conditions.push({ styles: { some: { style: { slug: { in: query.styleSlugs } } } } })
    }

    if (query.decades.length) {
      conditions.push({
        OR: query.decades.map((decade) => ({
          releaseYear: { gte: decade, lte: decade + 9 },
        })),
      })
    }

    return conditions.length ? { AND: conditions } : {}
  }

  private buildOrderBy(sort: AlbumQuery['sort']): Prisma.AlbumOrderByWithRelationInput {
    switch (sort) {
      case 'ano-desc':
        return { releaseYear: 'desc' }
      case 'recentes':
        return { createdAt: 'desc' }
      default:
        return { sortTitle: 'asc' }
    }
  }
}