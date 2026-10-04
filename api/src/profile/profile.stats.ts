// Agregados da coleção para o dashboard. Função pura: recebe as linhas já lidas e não toca no banco.

export interface StatsInputItem {
  condition: string | null
  album: {
    releaseYear: number | null
    label: string | null
    styles: Array<{ style: { slug: string; name: string } }>
    artists: Array<{ artist: { id: string; name: string } }>
  }
}

export interface Ranked {
  key: string
  label: string
  count: number
}

export interface CollectionStats {
  totals: {
    items: number
    artists: number
    labels: number
    styles: number
    oldestYear: number | null
    newestYear: number | null
    rated: number
  }
  byStyle: Ranked[]
  byArtist: Ranked[]
  byDecade: Ranked[]
  byLabel: Ranked[]
  byCondition: Ranked[]
}

/** Limite de itens em cada ranking. */
const TOP = 10

/** Ordem do estado de conservação, do melhor para o pior. */
const CONDITION_ORDER = ['lacrado', 'excelente', 'bom', 'regular', 'ruim'] as const

const CONDITION_LABEL: Record<string, string> = {
  lacrado: 'Lacrado',
  excelente: 'Excelente',
  bom: 'Bom',
  regular: 'Regular',
  ruim: 'Ruim',
  none: 'Não informado',
}

export function computeStats(items: StatsInputItem[]): CollectionStats {
  const styles = new Map<string, Ranked>()
  const artists = new Map<string, Ranked>()
  const decades = new Map<number, number>()
  const labels = new Map<string, number>()
  const conditions = new Map<string, number>()
  let oldestYear: number | null = null
  let newestYear: number | null = null
  let rated = 0

  for (const item of items) {
    const { album } = item

    // Coletânea conta para cada artista creditado; por isso a soma por artista pode passar do total.
    for (const { style } of album.styles) {
      bump(styles, style.slug, style.name)
    }
    for (const { artist } of album.artists) {
      bump(artists, artist.id, artist.name)
    }

    if (album.releaseYear !== null) {
      const decade = Math.floor(album.releaseYear / 10) * 10
      decades.set(decade, (decades.get(decade) ?? 0) + 1)
      oldestYear = oldestYear === null ? album.releaseYear : Math.min(oldestYear, album.releaseYear)
      newestYear = newestYear === null ? album.releaseYear : Math.max(newestYear, album.releaseYear)
    }

    if (album.label) {
      labels.set(album.label, (labels.get(album.label) ?? 0) + 1)
    }

    const condition = item.condition ?? 'none'
    conditions.set(condition, (conditions.get(condition) ?? 0) + 1)
    if (item.condition) rated += 1
  }

  return {
    totals: {
      items: items.length,
      artists: artists.size,
      labels: labels.size,
      styles: styles.size,
      oldestYear,
      newestYear,
      rated,
    },
    byStyle: sortDesc([...styles.values()]),
    byArtist: sortDesc([...artists.values()]).slice(0, TOP),
    byDecade: [...decades.entries()]
      .sort(([a], [b]) => a - b)
      .map(([decade, count]) => ({ key: String(decade), label: `Anos ${decade}`, count })),
    byLabel: sortDesc(
      [...labels.entries()].map(([label, count]) => ({ key: label, label, count })),
    ).slice(0, TOP),
    byCondition: [...CONDITION_ORDER, 'none']
      .filter((key) => conditions.has(key))
      .map((key) => ({
        key,
        label: CONDITION_LABEL[key],
        count: conditions.get(key) ?? 0,
      })),
  }
}

function bump(map: Map<string, Ranked>, key: string, label: string): void {
  const current = map.get(key)
  if (current) current.count += 1
  else map.set(key, { key, label, count: 1 })
}

/** Maior contagem primeiro; empate desempata por nome, para a ordem ser estável. */
function sortDesc(list: Ranked[]): Ranked[] {
  return list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
}
