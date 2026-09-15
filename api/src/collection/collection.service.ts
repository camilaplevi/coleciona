// api/src/collection/collection.service.ts

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

  /**
   * Coleção de um perfil. Serve tanto o dono quanto o visitante — quem decide
   * o que aparece é o RLS, não este método. Por isso `viewerId` é só repassado
   * e nunca usado numa condição aqui.
   */
  async findByUsername(
    username: string,
    filters: CollectionFilters,
    viewerId: string | null,
  ) {
    const db = this.prisma.forUser(viewerId)

    const profile = await db.profile.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    })

    // Perfil privado e perfil inexistente devolvem o mesmo 404 de propósito:
    // responder 403 para um e 404 para o outro revelaria quais usernames
    // existem no sistema.
    if (!profile) {
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

    // deleteMany em vez de delete: com RLS, apagar algo de outra pessoa
    // simplesmente não afeta nenhuma linha, e o count nos diz isso sem
    // precisar de uma consulta prévia de verificação.
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
      // Um campo de busca só, atravessando álbum, gravadora e artista —
      // é o comportamento que a tela promete.
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
      // 'artista-az' cai aqui de propósito: o agrupamento por artista é feito
      // no front (groupByArtist), e ordenar por título já deixa os discos
      // dentro de cada grupo em ordem estável antes do reordenamento por ano.
      case 'artista-az':
      case 'album-az':
      default:
        return { album: { sortTitle: 'asc' } }
    }
  }
}