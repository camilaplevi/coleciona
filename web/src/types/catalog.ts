/**
 * Coleciona — tipos de domínio.
 *
 * Espelham o schema, mas não são uma cópia dele: a UI trabalha com formas já
 * achatadas, para o componente não precisar navegar por três níveis de join.
 */

export type ArticleForm = 'masculino' | 'feminino' | 'banda'

export type Condition = 'lacrado' | 'excelente' | 'bom' | 'regular' | 'ruim'

export interface ArtistRef {
  id: string
  name: string
  articleForm: ArticleForm
}

export interface Artist extends ArtistRef {
  sortName: string
  activeFrom: number | null
  activeTo: number | null
  imageUrl: string | null
}

export interface StyleRef {
  id: string
  slug: string
  name: string
}

export interface SeriesRef {
  id: string
  name: string
  volume: string | null
}

/**
 * O que o AlbumCard precisa saber, e nada além disso.
 * Manter este tipo pequeno é o que impede o card de virar acoplado à query.
 */
export interface AlbumSummary {
  id: string
  title: string
  releaseYear: number | null
  label: string | null
  coverUrl: string | null
  isCompilation: boolean
  /** Artista creditado no card. Nulo em coletânea de vários artistas. */
  primaryArtist: ArtistRef | null
  /** Preenchido quando o disco vem de uma linha de coleção. */
  series: SeriesRef | null
}

export interface Album extends AlbumSummary {
  sortTitle: string
  artists: Array<ArtistRef & { role: 'principal' | 'participante' }>
  styles: StyleRef[]
}

/** Um disco na estante de alguém. */
export interface CollectionItem {
  id: string
  ownerId: string
  album: AlbumSummary
  condition: Condition | null
  notes: string | null
  acquiredAt: string | null
}

/** Um grupo da tela de coleção: cabeçalho de artista mais os discos dele. */
export interface ArtistGroup {
  artist: ArtistRef
  items: CollectionItem[]
}

export interface Profile {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  isPublic: boolean
  favoriteItemId: string | null
}

/** Estado dos filtros da tela de coleção. Vira query string na URL. */
export interface CollectionFilters {
  search: string
  styleSlugs: string[]
  decades: number[]
  label: string | null
  groupBy: 'artista' | 'estilo' | 'decada' | 'gravadora'
  sort: 'artista-az' | 'album-az' | 'ano-desc' | 'adicionado-desc'
}

export const defaultFilters: CollectionFilters = {
  search: '',
  styleSlugs: [],
  decades: [],
  label: null,
  groupBy: 'artista',
  sort: 'artista-az',
}