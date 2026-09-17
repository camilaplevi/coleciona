// api/src/collection/collection.mapper.ts
//
// Converte a linha do Prisma para os mesmos tipos que o front declara em
// web/src/types/catalog.ts. A conversão mora aqui, perto do banco, e não
// espalhada pelos componentes Vue.

import { Prisma } from '../generated/prisma/client.js'
import { albumInclude, toAlbumSummary } from '../common/album.mapper.js'

/** Relações que toda consulta de coleção precisa carregar. */
export const itemInclude = {
  album: { include: albumInclude },
} satisfies Prisma.CollectionItemInclude

type ItemRow = Prisma.CollectionItemGetPayload<{ include: typeof itemInclude }>

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