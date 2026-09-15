<script setup lang="ts">
import { computed } from 'vue'
import type { AlbumSummary } from '@/types/catalog'

const props = withDefaults(
  defineProps<{
    album: AlbumSummary
    /** Já está na coleção de quem está olhando. */
    owned?: boolean
    /** Perfil público de outra pessoa: nada de adicionar nem de marcador. */
    readonly?: boolean
    /** Aguardando a resposta do servidor depois do clique em adicionar. */
    pending?: boolean
  }>(),
  { owned: false, readonly: false, pending: false },
)

const emit = defineEmits<{
  add: [albumId: string]
  openAlbum: [albumId: string]
  openArtist: [artistId: string]
}>()

const credit = computed(() =>
  props.album.primaryArtist?.name ?? (props.album.isCompilation ? 'Vários artistas' : null),
)

const meta = computed(() => {
  const { label, releaseYear } = props.album
  if (label && releaseYear) return `${label}, ${releaseYear}`
  return label ?? (releaseYear ? String(releaseYear) : '')
})
</script>

<template>
  <article
    class="relative flex flex-col gap-3 has-[a:focus-visible]:outline-2
           has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-accent"
  >
    <div class="relative">
      <img
        v-if="album.coverUrl"
        :src="album.coverUrl"
        :alt="`Capa de ${album.title}`"
        loading="lazy"
        decoding="async"
        class="aspect-square w-full rounded-cover bg-inset object-cover"
      />
      <div
        v-else
        class="flex aspect-square w-full items-center justify-center rounded-cover bg-inset"
        role="img"
        :aria-label="`${album.title}, sem capa cadastrada`"
      >
        <span class="font-display text-2xl text-ink-muted">{{ album.title.charAt(0) }}</span>
      </div>

      <span
        v-if="owned && !readonly"
        class="absolute right-2 top-2 flex size-5 items-center justify-center
               rounded-full bg-owned text-card"
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16" class="size-3" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M3.5 8.5l3 3 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </div>

    <div class="flex flex-col gap-0.5">
      <h3 class="text-[15px] font-medium leading-snug text-ink">
        <!-- Link esticado: cobre o card inteiro sem aninhar âncoras, o que
             manteria o HTML inválido e quebraria a navegação por teclado. -->
        <a
          :href="`/album/${album.id}`"
          class="after:absolute after:inset-0 after:content-['']"
          @click.prevent="emit('openAlbum', album.id)"
        >
          {{ album.title }}
        </a>
      </h3>

      <p class="text-[13px] leading-5">
        <!-- Precisa ficar acima da camada do link esticado para receber o clique. -->
        <a
          v-if="album.primaryArtist"
          :href="`/artista/${album.primaryArtist.id}`"
          class="relative z-10 text-accent hover:text-accent-hover hover:underline"
          @click.prevent.stop="emit('openArtist', album.primaryArtist!.id)"
        >
          {{ credit }}
        </a>
        <span v-else class="text-ink-soft">{{ credit }}</span>
      </p>

      <p v-if="meta" class="text-[13px] leading-5 text-ink-muted">{{ meta }}</p>

      <span
        v-if="album.series"
        class="mt-1 w-fit rounded-full bg-jazz px-2.5 py-0.5 text-xs text-jazz-ink"
      >
        {{ album.series.name }}
        <template v-if="album.series.volume">, {{ album.series.volume }}</template>
      </span>

      <p v-if="owned && !readonly" class="mt-1 text-xs text-owned">Na sua coleção</p>

      <button
        v-else-if="!owned && !readonly"
        type="button"
        class="relative z-10 mt-1 w-fit rounded-full border border-strong px-3 py-1
               text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
        :aria-busy="pending"
        :aria-label="`Adicionar ${album.title} à sua coleção`"
        @click="emit('add', album.id)"
      >
        {{ pending ? 'Adicionando' : 'Adicionar' }}
      </button>
    </div>
  </article>
</template>