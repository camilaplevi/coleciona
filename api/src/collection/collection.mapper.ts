// api/src/collection/collection.mapper.ts
//
// Converte a linha do Prisma para os mesmos tipos que o front declara em
// web/src/types/catalog.ts. A conversão mora aqui, perto do banco, e não
// espalhada pelos componentes Vue.

import { Prisma } from '../generated/prisma/client.js'

/** Relações que toda consulta de coleção precisa carregar. */
export const itemInclude = {
  album: {
    include: {
      artists: {
        include: { artist: true },
        orderBy: { position: 'asc' },
      },
      seriesAlbums: {
        include: { series: true },
        take: 1,
      },
    },
  },
} satisfies Prisma.CollectionItemInclude

type ItemRow = Prisma.CollectionItemGetPayload<{ include: typeof itemInclude }>
type AlbumRow = ItemRow['album']

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

export function toCollectionItem(row: ItemRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    album: toAlbumSummary(row.album),
    condition: row.condition,
    notes: row.notes,
    // O front espera string; Date do Prisma viraria objeto no JSON.
    acquiredAt: row.acquiredAt ? row.acquiredAt.toISOString().slice(0, 10) : null,
  }
}