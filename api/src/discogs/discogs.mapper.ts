// api/src/discogs/discogs.mapper.ts
//
// Converte o formato do Discogs — que é dele, não nosso — para os tipos de
// domínio que web/src/types/catalog.ts declara. Fica perto do serviço que
// fala com o Discogs, e não espalhado pelos componentes Vue.

import type { Prisma } from '../generated/prisma/client.js'
import type { ArticleForm } from '../generated/prisma/enums.js'

/** Só os campos do resultado de busca que a UI precisa pra montar uma lista. */
export interface DiscogsArtistSearchResult {
  discogsId: number
  name: string
  imageUrl: string | null
}

/** Suficiente do artista completo pra gente montar uma linha de `artists`. */
export interface DiscogsArtistDetail {
  id: number
  name: string
  images?: Array<{ type: 'primary' | 'secondary'; uri: string }>
  /** Presente só em artistas que são grupo — é o sinal que temos de "banda". */
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

/**
 * O Discogs sufixa nomes repetidos com um número de desambiguação, tipo
 * "Chico Buarque (2)" — é o mecanismo deles pra dois artistas homônimos
 * terem URLs diferentes. Isso não deveria aparecer pra quem usa o app.
 */
function stripDisambiguation(rawName: string): string {
  return rawName.replace(/\s*\(\d+\)$/, '').trim()
}

const TRAILING_ARTICLE = /^(.+),\s*(the|os|as|o|a)$/i
const LEADING_ARTICLE = /^(os|as|o|a|the)\s+/i

/**
 * O Discogs também indexa pelo artigo no final ("Mutantes, Os", "Beatles,
 * The") — é a convenção deles pra ordenação alfabética. A gente já separa
 * nome de exibição e nome de ordenação (sortName), então extrai dos dois
 * formatos que o Discogs manda.
 */
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
 * O Discogs não tem gênero gramatical — é conceito nosso, não deles. Dá pra
 * inferir "banda" com confiança (tem `members`), mas masculino/feminino é
 * chute: usamos o artigo que o próprio nome carrega quando existe, e caímos
 * em masculino por padrão. Fica sujeito a correção manual depois — não tem
 * como fazer melhor só com o que o Discogs devolve.
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

/** Dados prontos pra um `create`/`update` de `artists` a partir do Discogs. */
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
    // Discogs não expõe período de atividade em campo estruturado — fica
    // null até alguém preencher na tela de edição do artista.
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
