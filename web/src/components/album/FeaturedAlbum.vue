<script setup lang="ts">
// web/src/components/album/FeaturedAlbum.vue

import { computed, useId } from 'vue'
import type { AlbumSummary } from '@/types/catalog'

const props = withDefaults(
  defineProps<{
    album: AlbumSummary
    owned?: boolean
    pending?: boolean
  }>(),
  { owned: false, pending: false },
)

const emit = defineEmits<{
  add: [albumId: string]
  openAlbum: [albumId: string]
  openArtist: [artistId: string]
}>()

const titleId = useId()

const meta = computed(() => {
  const { label, releaseYear } = props.album
  if (label && releaseYear) return `${label}, ${releaseYear}`
  return label ?? (releaseYear ? String(releaseYear) : '')
})
</script>

<template>
  <section
    :aria-labelledby="titleId"
    class="grid items-center gap-8 md:grid-cols-[minmax(0,360px)_1fr] md:gap-14"
  >
    <button
      type="button"
      class="block w-full max-w-[360px]"
      :aria-label="`Ver detalhes de ${album.title}`"
      @click="emit('openAlbum', album.id)"
    >
      <img
        v-if="album.coverUrl"
        :src="album.coverUrl"
        alt=""
        class="aspect-square w-full rounded-cover bg-inset object-cover"
      />
      <span
        v-else
        class="flex aspect-square w-full items-center justify-center rounded-cover bg-inset"
      >
        <span class="font-display text-8xl text-ink-muted" aria-hidden="true">
          {{ album.title.charAt(0) }}
        </span>
      </span>
    </button>

    <div class="flex flex-col items-start">
      <p class="mb-4 text-sm text-ink-muted">Novidade no catálogo</p>

      <h2 :id="titleId" class="font-display text-4xl leading-[1.1] text-ink md:text-5xl">
        {{ album.title }}
      </h2>

      <p class="mt-4 text-[17px]">
        <a
          v-if="album.primaryArtist"
          :href="`/artista/${album.primaryArtist.id}`"
          class="text-accent hover:text-accent-hover hover:underline"
          @click.prevent="emit('openArtist', album.primaryArtist!.id)"
        >
          {{ album.primaryArtist.name }}
        </a>
        <span v-else class="text-ink-soft">Vários artistas</span>
      </p>

      <p v-if="meta" class="mt-1 text-[15px] text-ink-muted">{{ meta }}</p>

      <p
        v-if="owned"
        class="mt-8 inline-flex items-center gap-2 rounded-full bg-owned-wash px-4 py-2
               text-sm text-owned"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-6" />
        </svg>
        Na sua coleção
      </p>

      <button
        v-else
        type="button"
        class="mt-8 h-11 rounded-control bg-accent px-6 text-sm font-medium text-white
               transition-colors hover:bg-accent-hover"
        :aria-busy="pending"
        @click="emit('add', album.id)"
      >
        {{ pending ? 'Adicionando' : 'Adicionar à coleção' }}
      </button>
    </div>
  </section>
</template>