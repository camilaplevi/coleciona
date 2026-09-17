// api/src/common/album.mapper.ts
//
// Mapeamento de álbum, compartilhado entre o módulo de catálogo e o de
// coleção. Saiu de collection.mapper.ts quando o segundo consumidor apareceu.

import type { Prisma } from '../generated/prisma/client.js'

/** Relações que todo álbum precisa carregar para virar um AlbumSummary. */
export const albumInclude = {
  artists: {
    include: { artist: true },
    orderBy: { position: 'asc' },
  },
  seriesAlbums: {
    include: { series: true },
    take: 1,
  },
} satisfies Prisma.AlbumInclude

export type AlbumRow = Prisma.AlbumGetPayload<{ include: typeof albumInclude }>

export function toAlbumSummary(album: AlbumRow) {
  const credited = album.artists.find((link) => link.role === 'principal')
  const seriesLink = album.seriesAlbums[0]

  return {
    id: album.id,
    title: album.title,
    releaseYear: album.releaseYear,
    label: album.label,
    coverUrl: album.coverUrl,
    isCompilation: album.isCompilation,
    // Coletânea de vários artistas não tem crédito único: o card mostra
    // "Vários artistas" e o disco ainda aparece na lista de cada um deles.
    primaryArtist:
      album.isCompilation || !credited
        ? null
        : {
            id: credited.artist.id,
            name: credited.artist.name,
            articleForm: credited.artist.articleForm,
          },
    series: seriesLink
      ? {
          id: seriesLink.series.id,
          name: seriesLink.series.name,
          volume: seriesLink.volume,
        }
      : null,
  }
}