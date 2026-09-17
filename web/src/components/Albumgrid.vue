    <script setup lang="ts">
import type { AlbumSummary } from '@/types/catalog'
import AlbumCard from '@/components/Albumcard.vue'

withDefaults(
  defineProps<{
    albums: AlbumSummary[]
    /** Ids já na coleção de quem está olhando. */
    ownedIds?: Set<string>
    /** Id do álbum aguardando resposta do servidor. */
    pendingId?: string | null
    /** Perfil de outra pessoa: nada de adicionar. */
    readonly?: boolean
    loading?: boolean
    /** Quantos esqueletos mostrar enquanto carrega. */
    skeletonCount?: number
    emptyMessage?: string
  }>(),
  {
    ownedIds: () => new Set<string>(),
    pendingId: null,
    readonly: false,
    loading: false,
    skeletonCount: 5,
    emptyMessage: 'Nenhum disco por aqui ainda.',
  },
)

defineEmits<{
  add: [albumId: string]
  openAlbum: [albumId: string]
  openArtist: [artistId: string]
}>()
</script>

<template>
  <!-- auto-fill com minmax mantém a grade legível em qualquer largura sem
       ponto de quebra manual. Reproduz o que a spec do Figma descreve. -->
  <div
    v-if="loading"
    class="grid gap-6"
    style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))"
    aria-busy="true"
  >
    <div v-for="n in skeletonCount" :key="n" class="flex flex-col gap-3">
      <div class="aspect-square w-full animate-pulse rounded-cover bg-inset" />
      <div class="h-4 w-3/4 animate-pulse rounded bg-inset" />
      <div class="h-3 w-1/2 animate-pulse rounded bg-inset" />
    </div>
  </div>

  <p v-else-if="albums.length === 0" class="py-8 text-center text-[15px] text-ink-muted">
    {{ emptyMessage }}
  </p>

  <div
    v-else
    class="grid gap-6"
    style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))"
  >
    <AlbumCard
      v-for="album in albums"
      :key="album.id"
      :album="album"
      :owned="ownedIds.has(album.id)"
      :pending="pendingId === album.id"
      :readonly="readonly"
      @add="$emit('add', $event)"
      @open-album="$emit('openAlbum', $event)"
      @open-artist="$emit('openArtist', $event)"
    />
  </div>
</template>