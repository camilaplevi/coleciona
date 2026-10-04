import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { itemInclude, toCollectionItem } from './collection.mapper.js'

export interface CollectionFilters {
  search?: string
  styleSlugs: string[]
  decades: number[]
  label?: string
  sort: 'artista-az' | 'album-az' | 'ano-desc' | 'adicionado-desc'
}

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  // viewerId entra na checagem de visibilidade e no contexto de RLS das consultas.
  async findByUsername(
    username: string,
    filters: CollectionFilters,
    viewerId: string | null,
  ) {
    const db = this.prisma.forUser(viewerId)

    const profile = await db.profile.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, isPublic: true },
    })

    // Privado e inexistente devolvem o mesmo 404: outra resposta revelaria quais usernames existem.
    // A checagem é explícita: a conexão da API tem BYPASSRLS e o banco não esconde perfis privados.
    if (!profile || (!profile.isPublic && viewerId !== profile.id)) {
      throw new NotFoundException('Perfil não encontrado.')
    }

    const items = await db.collectionItem.findMany({
      where: {
        ownerId: profile.id,
        album: this.buildAlbumFilter(filters),
      },
      include: itemInclude,
      orderBy: this.buildOrderBy(filters.sort),
    })

    return items.map(toCollectionItem)
  }

  async add(ownerId: string, albumId: string) {
    const db = this.prisma.forUser(ownerId)

    try {
      const item = await db.collectionItem.create({
        data: { ownerId, albumId },
        include: itemInclude,
      })
      return toCollectionItem(item)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Este disco já está na sua coleção.')
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException('Disco não encontrado no catálogo.')
      }
      throw error
    }
  }

  async remove(ownerId: string, itemId: string): Promise<void> {
    const db = this.prisma.forUser(ownerId)

    // deleteMany, não delete: se o item for de outra pessoa, count é 0 e nada vaza.
    const { count } = await db.collectionItem.deleteMany({
      where: { id: itemId, ownerId },
    })

    if (count === 0) {
      throw new NotFoundException('Disco não encontrado na sua coleção.')
    }
  }

  private buildAlbumFilter(filters: CollectionFilters): Prisma.AlbumWhereInput {
    const conditions: Prisma.AlbumWhereInput[] = []

    if (filters.search) {
      const contains = filters.search
      conditions.push({
        OR: [
          { title: { contains, mode: 'insensitive' } },
          { label: { contains, mode: 'insensitive' } },
          {
            artists: {
              some: { artist: { name: { contains, mode: 'insensitive' } } },
            },
          },
        ],
      })
    }

    if (filters.label) {
      conditions.push({ label: filters.label })
    }

    if (filters.styleSlugs.length) {
      conditions.push({
        styles: { some: { style: { slug: { in: filters.styleSlugs } } } },
      })
    }

    if (filters.decades.length) {
      conditions.push({
        OR: filters.decades.map((decade) => ({
          releaseYear: { gte: decade, lte: decade + 9 },
        })),
      })
    }

    return conditions.length ? { AND: conditions } : {}
  }

  private buildOrderBy(
    sort: CollectionFilters['sort'],
  ): Prisma.CollectionItemOrderByWithRelationInput {
    switch (sort) {
      case 'ano-desc':
        return { album: { releaseYear: 'desc' } }
      case 'adicionado-desc':
        return { createdAt: 'desc' }
      // 'artista-az' cai no default de propósito: o agrupamento por artista é feito no front.
      case 'artista-az':
      case 'album-az':
      default:
        return { album: { sortTitle: 'asc' } }
    }
  }
}