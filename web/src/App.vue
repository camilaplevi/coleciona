<script setup lang="ts">
import Albumcard from './components/Albumcard.vue'
import type { AlbumSummary } from '@/types/catalog'

// Amostra só para visualizar o card enquanto a tela de coleção não busca
// dados de verdade da API.
const album: AlbumSummary = {
  id: 'sample-album',
  title: 'Clube da Esquina',
  releaseYear: 1972,
  label: 'EMI-Odeon',
  coverUrl: null,
  isCompilation: false,
  primaryArtist: {
    id: 'sample-artist',
    name: 'Milton Nascimento & Lô Borges',
    articleForm: 'banda',
  },
  series: null,
}
</script>

<template>
  <div class="bg-background text-foreground border border-border rounded-lg p-8">
    <Albumcard :album="album" />
  </div>
</template>
