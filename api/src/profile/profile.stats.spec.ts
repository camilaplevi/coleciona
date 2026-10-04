import { describe, expect, it } from 'vitest'
import { computeStats, type StatsInputItem } from './profile.stats.js'

const nina = { id: 'nina', name: 'Nina Simone' }
const blakey = { id: 'blakey', name: 'Art Blakey' }

function item(
  overrides: Partial<StatsInputItem['album']> & { condition?: string | null },
): StatsInputItem {
  const { condition = null, ...album } = overrides
  return {
    condition,
    album: {
      releaseYear: 1970,
      label: 'Philips',
      styles: [],
      artists: [{ artist: nina }],
      ...album,
    },
  }
}

describe('computeStats', () => {
  it('zera tudo quando a coleção está vazia', () => {
    const stats = computeStats([])

    expect(stats.totals).toEqual({
      items: 0,
      artists: 0,
      labels: 0,
      styles: 0,
      oldestYear: null,
      newestYear: null,
      rated: 0,
    })
    expect(stats.byArtist).toEqual([])
    expect(stats.byCondition).toEqual([])
  })

  it('conta cada disco em cada estilo e cada artista creditado', () => {
    const stats = computeStats([
      item({
        styles: [{ style: { slug: 'jazz', name: 'Jazz' } }],
        artists: [{ artist: nina }, { artist: blakey }],
      }),
      item({
        styles: [{ style: { slug: 'jazz', name: 'Jazz' } }, { style: { slug: 'soul', name: 'Soul' } }],
        artists: [{ artist: nina }],
      }),
    ])

    expect(stats.byStyle).toEqual([
      { key: 'jazz', label: 'Jazz', count: 2 },
      { key: 'soul', label: 'Soul', count: 1 },
    ])
    expect(stats.byArtist).toEqual([
      { key: 'nina', label: 'Nina Simone', count: 2 },
      { key: 'blakey', label: 'Art Blakey', count: 1 },
    ])
    expect(stats.totals.artists).toBe(2)
    expect(stats.totals.styles).toBe(2)
  })

  it('agrupa por década e acha o período da coleção', () => {
    const stats = computeStats([
      item({ releaseYear: 1958 }),
      item({ releaseYear: 1961 }),
      item({ releaseYear: 1972 }),
      item({ releaseYear: null }),
    ])

    expect(stats.byDecade).toEqual([
      { key: '1950', label: 'Anos 1950', count: 1 },
      { key: '1960', label: 'Anos 1960', count: 1 },
      { key: '1970', label: 'Anos 1970', count: 1 },
    ])
    expect(stats.totals.oldestYear).toBe(1958)
    expect(stats.totals.newestYear).toBe(1972)
  })

  it('ignora gravadora nula e ordena as gravadoras por contagem', () => {
    const stats = computeStats([
      item({ label: 'Blue Note' }),
      item({ label: 'Blue Note' }),
      item({ label: 'Philips' }),
      item({ label: null }),
    ])

    expect(stats.byLabel).toEqual([
      { key: 'Blue Note', label: 'Blue Note', count: 2 },
      { key: 'Philips', label: 'Philips', count: 1 },
    ])
    expect(stats.totals.labels).toBe(2)
  })

  it('mantém a ordem da conservação, do melhor ao pior, e separa o não informado', () => {
    const stats = computeStats([
      item({ condition: 'ruim' }),
      item({ condition: 'lacrado' }),
      item({ condition: null }),
      item({ condition: 'lacrado' }),
    ])

    expect(stats.byCondition).toEqual([
      { key: 'lacrado', label: 'Lacrado', count: 2 },
      { key: 'ruim', label: 'Ruim', count: 1 },
      { key: 'none', label: 'Não informado', count: 1 },
    ])
    expect(stats.totals.rated).toBe(3)
  })

  it('limita os rankings de artistas e gravadoras a dez itens', () => {
    const many = Array.from({ length: 15 }, (_, i) => item({
      artists: [{ artist: { id: `a${i}`, name: `Artista ${i}` } }],
      label: `Gravadora ${i}`,
    }))
    const stats = computeStats(many)

    expect(stats.byArtist).toHaveLength(10)
    expect(stats.byLabel).toHaveLength(10)
    expect(stats.totals.artists).toBe(15)
  })
})
