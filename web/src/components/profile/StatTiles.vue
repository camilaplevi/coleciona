<script setup lang="ts">
// Números de resumo. Não é gráfico: o número é a própria informação, por isso sans e fonte proporcional.

import { computed } from 'vue'
import type { CollectionStats } from '@/types/profile'

const props = defineProps<{ totals: CollectionStats['totals'] }>()

const period = computed(() => {
  const { oldestYear, newestYear } = props.totals
  if (oldestYear === null || newestYear === null) return '—'
  return oldestYear === newestYear ? String(oldestYear) : `${oldestYear}–${newestYear}`
})

const ratedShare = computed(() => {
  const { items, rated } = props.totals
  if (!items) return '—'
  return `${Math.round((rated / items) * 100)}%`
})

const tiles = computed(() => [
  { label: 'Discos', value: props.totals.items },
  { label: 'Artistas', value: props.totals.artists },
  { label: 'Gravadoras', value: props.totals.labels },
  { label: 'Estilos', value: props.totals.styles },
  { label: 'Período da coleção', value: period.value },
  { label: 'Com estado informado', value: ratedShare.value },
])
</script>

<template>
  <dl class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
    <div
      v-for="tile in tiles"
      :key="tile.label"
      class="rounded-card border border-hairline bg-card px-4 py-4"
    >
      <dt class="text-[13px] text-ink-muted">{{ tile.label }}</dt>
      <dd class="mt-1 text-[22px] font-semibold text-ink">{{ tile.value }}</dd>
    </div>
  </dl>
</template>
