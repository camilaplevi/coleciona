// web/src/services/catalog.ts

import type { AlbumSummary, StyleRef } from '@/types/catalog'
import { request, toQuery } from './http'

export interface HomeSection {
  style: StyleRef
  albums: AlbumSummary[]
}

export interface HomePayload {
  featured: AlbumSummary | null
  sections: HomeSection[]
  /** Álbuns que já estão na coleção de quem está olhando. Vazio sem sessão. */
  ownedAlbumIds: string[]
}

export interface AlbumListPayload {
  items: AlbumSummary[]
  total: number
  page: number
  perPage: number
  ownedAlbumIds: string[]
}

export interface AlbumQuery {
  search?: string
  styleSlugs?: string[]
  decades?: number[]
  label?: string
  sort?: 'album-az' | 'ano-desc' | 'recentes'
  page?: number
}

export function fetchHome(signal?: AbortSignal): Promise<HomePayload> {
  return request<HomePayload>('/inicio', { signal })
}

export function fetchAlbums(query: AlbumQuery, signal?: AbortSignal): Promise<AlbumListPayload> {
  const path =
    '/albuns' +
    toQuery({
      busca: query.search,
      estilos: query.styleSlugs,
      decadas: query.decades?.map(String),
      gravadora: query.label,
      ordenar: query.sort,
      pagina: query.page,
    })

  return request<AlbumListPayload>(path, { signal })
}