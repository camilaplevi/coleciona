<script setup lang="ts">
// Resultados do Discogs ainda fora do catálogo. Ao adicionar, o disco é
// gravado no catálogo local antes de entrar na coleção.

import StateMessage from '@/components/feedback/StateMessage.vue'
import { describeError } from '@/utils/describeError'
import type { DiscogsRelease } from '@/services/discogs'

defineProps<{
  releases: DiscogsRelease[]
  loading: boolean
  error: unknown
  pendingId: number | null
  addedIds: Set<number>
}>()

defineEmits<{
  add: [discogsId: number]
  retry: []
}>()
</script>

<template>
  <section aria-labelledby="titulo-discogs" class="border-t border-hairline pt-10">
    <div class="mb-6">
      <h2 id="titulo-discogs" class="font-display text-2xl text-ink md:text-3xl">No Discogs</h2>
      <p class="mt-2 text-sm text-ink-muted">
        Discos que ainda não estão no Coleciona. Ao adicionar, o disco entra no catálogo e na sua coleção.
      </p>
    </div>

    <StateMessage
      v-if="error"
      v-bind="describeError(error, 'os discos do Discogs')"
      compact
      action-label="Tentar de novo"
      @action="$emit('retry')"
    />

    <ul v-else-if="loading && !releases.length" aria-busy="true" class="space-y-4">
      <li v-for="n in 4" :key="n" class="flex items-center gap-4">
        <div class="size-16 shrink-0 animate-pulse rounded-cover bg-inset" />
        <div class="h-4 w-1/2 animate-pulse rounded bg-inset" />
      </li>
    </ul>

    <StateMessage
      v-else-if="!releases.length"
      tone="not-found"
      compact
      title="Nenhum disco no Discogs para essa busca"
    />

    <ul v-else class="divide-y divide-hairline">
      <li
        v-for="release in releases"
        :key="release.discogsId"
        class="flex items-center gap-4 py-4"
      >
        <img
          v-if="release.coverUrl"
          :src="release.coverUrl"
          alt=""
          loading="lazy"
          class="size-16 shrink-0 rounded-cover bg-inset object-cover"
        />
        <span
          v-else
          class="flex size-16 shrink-0 items-center justify-center rounded-cover bg-inset font-display text-xl text-ink-muted"
          aria-hidden="true"
        >
          {{ release.title.charAt(0) }}
        </span>

        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-medium text-ink">{{ release.title }}</p>
          <p class="truncate text-[13px] text-ink-soft">
            {{ [release.artist, release.year, release.label].filter(Boolean).join(' · ') }}
          </p>
          <p v-if="release.genres.length" class="mt-1 truncate text-[12px] text-ink-muted">
            {{ release.genres.join(', ') }}
          </p>
        </div>

        <p
          v-if="addedIds.has(release.discogsId)"
          class="shrink-0 rounded-full bg-owned-wash px-3 py-1.5 text-[13px] text-owned"
        >
          Na sua coleção
        </p>
        <button
          v-else
          type="button"
          class="h-10 shrink-0 rounded-control bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
          :disabled="pendingId !== null"
          :aria-busy="pendingId === release.discogsId"
          @click="$emit('add', release.discogsId)"
        >
          {{ pendingId === release.discogsId ? 'Adicionando' : 'Adicionar à coleção' }}
        </button>
      </li>
    </ul>
  </section>
</template>
