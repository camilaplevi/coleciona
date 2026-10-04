// Traduz o formato do Discogs para os tipos de domínio em web/src/types/catalog.ts.

import type { Prisma } from '../generated/prisma/client.js'
import type { ArticleForm } from '../generated/prisma/enums.js'

export interface DiscogsArtistSearchResult {
  discogsId: number
  name: string
  imageUrl: string | null
}

export interface DiscogsArtistDetail {
  id: number
  name: string
  images?: Array<{ type: 'primary' | 'secondary'; uri: string }>
  // Só artistas-grupo têm members: é o sinal de "banda".
  members?: Array<{ id: number; name: string }>
}

interface RawSearchResult {
  id: number
  title: string
  thumb?: string
  cover_image?: string
}

export interface RawSearchResponse {
  results: RawSearchResult[]
}

export interface RawArtistResponse {
  id: number
  name: string
  images?: Array<{ type: string; uri: string }>
  members?: Array<{ id: number; name: string; active?: boolean }>
}

/** Sufixo de desambiguação do Discogs ("Chico Buarque (2)"): não deve aparecer no app. */
function stripDisambiguation(rawName: string): string {
  return rawName.replace(/\s*\(\d+\)$/, '').trim()
}

const TRAILING_ARTICLE = /^(.+),\s*(the|os|as|o|a)$/i
const LEADING_ARTICLE = /^(os|as|o|a|the)\s+/i

/** O Discogs indexa pelo artigo no fim ("Mutantes, Os"). Separamos nome de exibição e sortName. */
function splitNameForSorting(rawName: string): { name: string; sortName: string; article: string | null } {
  const trailing = rawName.match(TRAILING_ARTICLE)
  if (trailing) {
    const [, base, article] = trailing
    const capitalized = article.charAt(0).toUpperCase() + article.slice(1).toLowerCase()
    return { name: `${capitalized} ${base}`, sortName: base, article }
  }

  const leading = rawName.match(LEADING_ARTICLE)
  if (leading) {
    return { name: rawName, sortName: rawName.slice(leading[0].length), article: leading[1] }
  }

  return { name: rawName, sortName: rawName, article: null }
}

/**
 * Gênero gramatical não vem do Discogs. "banda" é certo (tem members); masculino ou feminino
 * sai do artigo do nome, com masculino como padrão. Pode precisar de correção manual.
 */
function guessArticleForm(isGroup: boolean, article: string | null): ArticleForm {
  if (isGroup) return 'banda'
  if (article) {
    const normalized = article.toLowerCase()
    if (normalized === 'a' || normalized === 'as') return 'feminino'
  }
  return 'masculino'
}

export function toSearchResults(raw: RawSearchResponse): DiscogsArtistSearchResult[] {
  return raw.results.map((item) => ({
    discogsId: item.id,
    name: stripDisambiguation(item.title),
    imageUrl: item.cover_image || item.thumb || null,
  }))
}

export function parseArtistDetail(raw: RawArtistResponse): DiscogsArtistDetail {
  return {
    id: raw.id,
    name: stripDisambiguation(raw.name),
    images: raw.images
      ?.filter((img): img is { type: 'primary' | 'secondary'; uri: string } =>
        img.type === 'primary' || img.type === 'secondary',
      ),
    members: raw.members,
  }
}

export function toArtistData(detail: DiscogsArtistDetail): Prisma.ArtistUncheckedCreateInput {
  const isGroup = Boolean(detail.members?.length)
  const { name, sortName, article } = splitNameForSorting(detail.name)
  const primaryImage = detail.images?.find((img) => img.type === 'primary') ?? detail.images?.[0]

  return {
    discogsId: detail.id,
    name,
    sortName,
    articleForm: guessArticleForm(isGroup, article),
    imageUrl: primaryImage?.uri ?? null,
    // Discogs não expõe período de atividade: fica null até edição manual.
    activeFrom: null,
    activeTo: null,
  }
}

interface ArtistRow {
  id: string
  name: string
  sortName: string
  articleForm: ArticleForm
  activeFrom: number | null
  activeTo: number | null
  imageUrl: string | null
}

export function toArtist(row: ArtistRow) {
  return {
    id: row.id,
    name: row.name,
    articleForm: row.articleForm,
    sortName: row.sortName,
    activeFrom: row.activeFrom,
    activeTo: row.activeTo,
    imageUrl: row.imageUrl,
  }
}

/** Discogs usa este id para "Various" nas coletâneas: não é um artista de verdade. */
const VARIOUS_ARTIST_ID = 194

export interface ReleaseSearchItem {
  discogsId: number
  artist: string | null
  title: string
  year: number | null
  label: string | null
  genres: string[]
  coverUrl: string | null
}

interface RawReleaseSearchItem {
  id: number
  title: string
  year?: string
  label?: string[]
  genre?: string[]
  cover_image?: string
  thumb?: string
}

export interface RawReleaseSearchResponse {
  results: RawReleaseSearchItem[]
}

/** O título vem como "Artista - Título"; separa no primeiro " - ". */
export function toReleaseSearchResults(raw: RawReleaseSearchResponse): ReleaseSearchItem[] {
  return raw.results.map((item) => {
    const separator = item.title.indexOf(' - ')
    const artist = separator > 0 ? item.title.slice(0, separator) : null
    const title = separator > 0 ? item.title.slice(separator + 3) : item.title
    const year = Number(item.year)

    return {
      discogsId: item.id,
      artist: artist ? stripDisambiguation(artist) : null,
      title,
      year: Number.isInteger(year) && year > 0 ? year : null,
      label: item.label?.[0] ?? null,
      genres: item.genre ?? [],
      coverUrl: item.cover_image || item.thumb || null,
    }
  })
}

export interface RawRelease {
  id: number
  title: string
  year?: number
  labels?: Array<{ name: string }>
  genres?: string[]
  images?: Array<{ type: string; uri: string }>
  artists?: Array<{ id: number; name: string }>
  tracklist?: Array<{ position: string; title: string; duration?: string; type_?: string }>
}

export interface ReleaseDetail {
  discogsId: number
  title: string
  year: number | null
  label: string | null
  genres: string[]
  coverUrl: string | null
  isCompilation: boolean
  artists: Array<{ id: number; name: string }>
  tracks: Array<{ position: string; title: string; duration: string | null }>
}

export function parseRelease(raw: RawRelease): ReleaseDetail {
  const artists = raw.artists ?? []
  const primaryImage = raw.images?.find((img) => img.type === 'primary') ?? raw.images?.[0]

  return {
    discogsId: raw.id,
    title: raw.title,
    year: raw.year && raw.year > 0 ? raw.year : null,
    label: raw.labels?.[0]?.name ?? null,
    genres: raw.genres ?? [],
    coverUrl: primaryImage?.uri ?? null,
    isCompilation: artists.some((artist) => artist.id === VARIOUS_ARTIST_ID),
    artists: artists
      .filter((artist) => artist.id !== VARIOUS_ARTIST_ID)
      .map((artist) => ({ id: artist.id, name: stripDisambiguation(artist.name) })),
    // Títulos de seção ("Side A") vêm no mesmo tracklist: só interessam as faixas.
    tracks: (raw.tracklist ?? [])
      .filter((track) => (track.type_ ?? 'track') === 'track' && track.title)
      .map((track) => ({
        position: track.position,
        title: track.title,
        duration: track.duration || null,
      })),
  }
}
