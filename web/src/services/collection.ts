/**
 * Camada de acesso a dados da tela de coleção.
 *
 * Agora fala com a API própria, que é quem conversa com o Neon. O front não
 * conhece Postgres, não guarda credencial de banco e não sabe o formato das
 * tabelas — só os tipos de domínio.
 */

import type {
  ArtistGroup,
  CollectionFilters,
  CollectionItem,
} from '@/types/catalog'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    // O token vai em cookie httpOnly, definido pela API no login.
    // Guardar token em localStorage deixa a sessão exposta a qualquer XSS.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      body.message ?? 'Não foi possível completar a ação. Tente de novo.',
    )
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

function toQueryString(filters: CollectionFilters): string {
  const params = new URLSearchParams()

  if (filters.search) params.set('busca', filters.search)
  if (filters.label) params.set('gravadora', filters.label)
  if (filters.styleSlugs.length) params.set('estilos', filters.styleSlugs.join(','))
  if (filters.decades.length) params.set('decadas', filters.decades.join(','))
  params.set('ordenar', filters.sort)

  return params.toString()
}

/**
 * Coleção de um usuário. A API aplica os filtros em SQL e devolve os itens já
 * no formato de domínio — a conversão de snake_case para camelCase acontece no
 * backend, perto do banco, e não espalhada pelos componentes.
 *
 * Visibilidade continua sendo decidida no Postgres, pelas políticas de RLS:
 * a API só informa quem é o usuário da transação.
 */
export function fetchCollection(
  username: string,
  filters: CollectionFilters,
  signal?: AbortSignal,
): Promise<CollectionItem[]> {
  return request<CollectionItem[]>(
    `/perfis/${encodeURIComponent(username)}/colecao?${toQueryString(filters)}`,
    { signal },
  )
}

/** Adiciona um disco à coleção de quem está logado. */
export function addToCollection(albumId: string): Promise<CollectionItem> {
  return request<CollectionItem>('/colecao', {
    method: 'POST',
    body: JSON.stringify({ albumId }),
  })
}

export function removeFromCollection(itemId: string): Promise<void> {
  return request<void>(`/colecao/${itemId}`, { method: 'DELETE' })
}

/**
 * Agrupa por artista em ordem alfabética, com os discos de cada um ordenados
 * por ano. Coletâneas sem crédito único ficam de fora dos grupos — elas têm a
 * faixa própria de séries no topo da tela.
 *
 * Continua no cliente de propósito: são dezenas ou centenas de itens, e trocar
 * "agrupar por" fica instantâneo, sem nova ida ao servidor. Se a coleção passar
 * de uns 2 mil discos, isso vira paginação e o agrupamento sobe para uma view.
 */
export function groupByArtist(items: CollectionItem[]): ArtistGroup[] {
  const groups = new Map<string, ArtistGroup>()

  for (const item of items) {
    const artist = item.album.primaryArtist
    if (!artist) continue

    let group = groups.get(artist.id)
    if (!group) {
      group = { artist, items: [] }
      groups.set(artist.id, group)
    }
    group.items.push(item)
  }

  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

  return [...groups.values()]
    .sort((a, b) => collator.compare(a.artist.name, b.artist.name))
    .map((group) => ({
      ...group,
      items: group.items.sort(
        (a, b) => (a.album.releaseYear ?? 0) - (b.album.releaseYear ?? 0),
      ),
    }))
}