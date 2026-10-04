/** Tipos de domínio. A UI recebe formas já achatadas, sem três níveis de join. */

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

/** Só o que o card precisa. Manter pequeno evita acoplar o card à query. */
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

export interface CollectionItem {
  id: string
  ownerId: string
  album: AlbumSummary
  condition: Condition | null
  notes: string | null
  acquiredAt: string | null
}

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
  hasOnboarded: boolean
  /** Falso até a pessoa clicar no link enviado por e-mail. */
  emailVerified: boolean
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