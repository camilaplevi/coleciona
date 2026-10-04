import type { PrismaClient } from '../generated/prisma/client.js'
import type { AlbumArtistRole } from '../generated/prisma/enums.js'
import { DiscogsClient } from './discogs.client.js'
import { parseRelease, toArtistData, type RawRelease, type ReleaseDetail } from './discogs.mapper.js'

/**
 * Grava releases do Discogs no catálogo local. Não depende do Nest: o serviço
 * da API e o importador em lote (prisma/import-discogs.ts) usam esta mesma
 * classe, então a regra de gravação fica em um lugar só.
 */
export class ReleaseImporter {
  constructor(private readonly prisma: PrismaClient) {}

  async localAlbumId(discogsReleaseId: number): Promise<string | null> {
    const album = await this.prisma.album.findUnique({
      where: { discogsReleaseId },
      select: { id: true },
    })
    return album?.id ?? null
  }

  /**
   * Devolve o id local do disco. Se ele já existe, não há chamada à API:
   * importar o mesmo release de novo é barato.
   */
  async import(client: DiscogsClient, discogsReleaseId: number, userId: string): Promise<string> {
    const existing = await this.localAlbumId(discogsReleaseId)
    if (existing) return existing

    const release = parseRelease(await client.get<RawRelease>(`/releases/${discogsReleaseId}`))

    try {
      return await this.save(release, userId)
    } catch (error) {
      // Dois pedidos simultâneos para o mesmo release: o segundo perde no unique.
      if (isUniqueViolation(error)) {
        const winner = await this.localAlbumId(discogsReleaseId)
        if (winner) return winner
      }
      throw error
    }
  }

  private save(release: ReleaseDetail, userId: string): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        // As políticas de RLS de escrita exigem usuário na transação.
        await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, TRUE)`

        const role: AlbumArtistRole = release.isCompilation ? 'participante' : 'principal'
        const artists = []
        for (const [position, artist] of release.artists.entries()) {
          const row = await tx.artist.upsert({
            where: { discogsId: artist.id },
            create: toArtistData({ id: artist.id, name: artist.name }),
            update: {},
          })
          artists.push({ artist: { connect: { id: row.id } }, role, position })
        }

        // Gêneros do Discogs ("Jazz", "Funk / Soul") viram os estilos das seções da home.
        const styles = []
        for (const genre of release.genres) {
          const slug = toSlug(genre)
          const style = await tx.style.upsert({
            where: { slug },
            create: { slug, name: genre },
            update: {},
          })
          styles.push({ styleId: style.id })
        }

        const album = await tx.album.create({
          data: {
            title: release.title,
            sortTitle: release.title,
            releaseYear: release.year,
            label: release.label,
            coverUrl: release.coverUrl,
            isCompilation: release.isCompilation,
            discogsReleaseId: release.discogsId,
            artists: { create: artists },
            styles: { create: styles },
            tracks: {
              create: release.tracks.map((track, sortOrder) => ({
                position: track.position,
                title: track.title,
                duration: track.duration,
                sortOrder,
              })),
            },
          },
          select: { id: true },
        })

        return album.id
      },
      // Um disco com muitos artistas e faixas passa do limite padrão de 5s no pooler do Neon.
      { timeout: 30_000 },
    )
  }
}

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2002'
}
