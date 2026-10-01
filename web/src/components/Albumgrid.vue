    <script setup lang="ts">
import type { AlbumSummary } from '@/types/catalog'
import StateMessage from '@/components/feedback/StateMessage.vue'
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
    emptyTitle?: string
    emptyDescription?: string
    /** 'editorial': o primeiro disco ocupa 2×2 e os outros quatro fecham o bloco. */
    variant?: 'grid' | 'editorial'
  }>(),
  {
    ownedIds: () => new Set<string>(),
    pendingId: null,
    readonly: false,
    loading: false,
    skeletonCount: 5,
    emptyTitle: 'Nenhum disco por aqui ainda',
    emptyDescription: undefined,
    variant: 'grid',
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

  <StateMessage
    v-else-if="albums.length === 0"
    tone="not-found"
    compact
    :title="emptyTitle"
    :description="emptyDescription"
  />

  <div
    v-else-if="variant === 'editorial'"
    class="grid grid-cols-2 items-start gap-6 md:grid-cols-4"
  >
    <AlbumCard
      v-for="(album, index) in albums"
      :key="album.id"
      :album="album"
      :size="index === 0 ? 'lg' : 'md'"
      :class="index === 0 ? 'col-span-2 md:row-span-2' : ''"
      :owned="ownedIds.has(album.id)"
      :pending="pendingId === album.id"
      :readonly="readonly"
      @add="$emit('add', $event)"
      @open-album="$emit('openAlbum', $event)"
      @open-artist="$emit('openArtist', $event)"
    />
  </div>

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