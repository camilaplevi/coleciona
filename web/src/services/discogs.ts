import type { AlbumSummary } from '@/types/catalog'
import { request, toQuery } from './http'

/** Disco de vinil encontrado no Discogs, ainda fora do catálogo local. */
export interface DiscogsRelease {
  discogsId: number
  artist: string | null
  title: string
  year: number | null
  label: string | null
  genres: string[]
  coverUrl: string | null
}

export function searchDiscogsReleases(busca: string, signal?: AbortSignal): Promise<DiscogsRelease[]> {
  return request<DiscogsRelease[]>(`/discogs/discos${toQuery({ busca })}`, { signal })
}

/** Grava o disco no catálogo do Coleciona e devolve o resumo local, pronto para a coleção. */
export function importDiscogsRelease(discogsId: number): Promise<AlbumSummary> {
  return request<AlbumSummary>(`/discogs/discos/${discogsId}/importar`, { method: 'POST' })
}
