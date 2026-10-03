<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import FeaturedAlbum from '@/components/album/FeaturedAlbum.vue'
import AlbumGrid from '@/components/Albumgrid.vue'
import StateMessage from '@/components/feedback/StateMessage.vue'
import AppToast, { type Toast } from '@/components/feedback/AppToast.vue'
import { useAsync } from '@/composables/useAsync'
import { fetchAlbums, fetchHome } from '@/services/catalog'
import { addToCollection } from '@/services/collection'
import { ApiError } from '@/services/http'
import { describeError } from '@/utils/describeError'
import type { StyleRef } from '@/types/catalog'

const searchTerm = ref('')
const activeStyle = ref<StyleRef | null>(null)
const query = computed(() => searchTerm.value.trim())
const isBrowsing = computed(() => query.value.length > 0 || activeStyle.value !== null)

const home = useAsync((signal) => fetchHome(signal))
const results = useAsync((signal) =>
  fetchAlbums(
    {
      search: query.value || undefined,
      styleSlugs: activeStyle.value ? [activeStyle.value.slug] : undefined,
    },
    signal,
  ),
)

const featured = computed(() => home.data.value?.featured ?? null)
const sections = computed(() => home.data.value?.sections ?? [])
const isHomeEmpty = computed(() => !featured.value && sections.value.length === 0)

const resultsTitle = computed(() => {
  if (query.value && activeStyle.value) return `“${query.value}” em ${activeStyle.value.name}`
  if (query.value) return `Resultados para “${query.value}”`
  return activeStyle.value?.name ?? ''
})

const resultsCount = computed(() => {
  const total = results.data.value?.total ?? 0
  return total === 1 ? '1 disco' : `${total} discos`
})

let timer: ReturnType<typeof setTimeout> | undefined
watch(query, () => {
  clearTimeout(timer)
  if (!isBrowsing.value) return
  timer = setTimeout(() => results.run(), 300)
})

function browseStyle(style: StyleRef) {
  searchTerm.value = ''
  activeStyle.value = style
  results.run()
  window.scrollTo({ top: 0 })
}

function backToHome() {
  searchTerm.value = ''
  activeStyle.value = null
}

onMounted(() => home.run())

// ---------------------------------------------------------------------------
// Coleção
// ---------------------------------------------------------------------------

const ownedIds = ref(new Set<string>())
const pendingId = ref<string | null>(null)
const toast = ref<Toast | null>(null)

function absorbOwned(ids: string[] | undefined) {
  if (!ids?.length) return
  ownedIds.value = new Set([...ownedIds.value, ...ids])
}

watch(() => home.data.value, (payload) => absorbOwned(payload?.ownedAlbumIds))
watch(() => results.data.value, (payload) => absorbOwned(payload?.ownedAlbumIds))

function promptSignup(message = 'Crie sua conta para começar a montar sua coleção.') {
  toast.value = {
    message,
    tone: 'info',
    actionLabel: 'Criar conta',
    action: () => {},
  }
}

async function handleAdd(albumId: string) {
  pendingId.value = albumId

  try {
    await addToCollection(albumId)
    ownedIds.value = new Set([...ownedIds.value, albumId])
    toast.value = { message: 'Disco adicionado à sua coleção.', tone: 'info' }
  } catch (cause) {
    if (cause instanceof ApiError && cause.needsAuth) {
      promptSignup()
      return
    }
    toast.value = {
      message:
        cause instanceof ApiError && cause.kind !== 'server'
          ? cause.message
          : 'Não foi possível adicionar agora. Tente de novo em instantes.',
      tone: 'error',
    }
  } finally {
    pendingId.value = null
  }
}

function openAlbum(id: string) {
  console.info('abrir álbum', id)
}

function openArtist(id: string) {
  console.info('abrir artista', id)
}
</script>

<template>
  <div class="min-h-screen bg-page">
    <AppHeader
      v-model:search="searchTerm"
      @auth="promptSignup()"
      @open-collection="promptSignup('Entre na sua conta para ver a sua coleção.')"
    />

    <main class="mx-auto max-w-[1200px] px-6 pb-28 pt-10 md:pt-14">
      <!-- ============================================================== -->
      <!-- Resultados: busca ou "ver todos" de um estilo                    -->
      <!-- ============================================================== -->
      <section v-if="isBrowsing" aria-labelledby="titulo-resultados">
        <div class="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
          <div>
            <button
              type="button"
              class="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors
                     hover:text-accent"
              @click="backToHome"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75"
                   stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                <path d="M10 3.5L5.5 8l4.5 4.5" />
              </svg>
              Voltar ao início
            </button>
            <h1 id="titulo-resultados" class="font-display text-3xl text-ink md:text-4xl">
              {{ resultsTitle }}
            </h1>
          </div>
          <p
            v-if="results.data.value && !results.loading.value && !results.error.value"
            class="text-sm text-ink-muted"
          >
            {{ resultsCount }}
          </p>
        </div>

        <StateMessage
          v-if="results.error.value"
          v-bind="describeError(results.error.value, 'os resultados')"
          action-label="Tentar de novo"
          @action="results.run()"
        />

        <AlbumGrid
          v-else
          :albums="results.data.value?.items ?? []"
          :owned-ids="ownedIds"
          :pending-id="pendingId"
          :loading="results.loading.value"
          :skeleton-count="10"
          empty-title="Nenhum disco encontrado"
          empty-description="Confira a grafia, ou tente pelo nome do artista ou da gravadora."
          @add="handleAdd"
          @open-album="openAlbum"
          @open-artist="openArtist"
        />
      </section>

      <!-- ============================================================== -->
      <!-- Página inicial                                                   -->
      <!-- ============================================================== -->
      <template v-else>
        <h1 class="sr-only">Explorar o catálogo</h1>

        <StateMessage
          v-if="home.error.value"
          v-bind="describeError(home.error.value, 'o catálogo')"
          action-label="Tentar de novo"
          @action="home.run()"
        />

        <!-- Esqueleto só na primeira carga. Numa nova tentativa, o conteúdo
             anterior continua na tela em vez de piscar. -->
        <div v-else-if="home.loading.value && !home.data.value" aria-busy="true">
          <div class="mb-20 grid items-center gap-8 md:grid-cols-[minmax(0,360px)_1fr] md:gap-14">
            <div class="aspect-square w-full max-w-[360px] animate-pulse rounded-cover bg-inset" />
            <div class="space-y-4">
              <div class="h-4 w-32 animate-pulse rounded bg-inset" />
              <div class="h-12 w-3/4 animate-pulse rounded bg-inset" />
              <div class="h-5 w-1/3 animate-pulse rounded bg-inset" />
            </div>
          </div>
          <AlbumGrid :albums="[]" loading :skeleton-count="5" />
        </div>

        <StateMessage
          v-else-if="isHomeEmpty"
          tone="empty"
          title="O catálogo ainda está vazio"
          description="Assim que os primeiros discos forem cadastrados, eles aparecem aqui."
        />

        <template v-else>
          <FeaturedAlbum
            v-if="featured"
            class="mb-16 md:mb-24"
            :album="featured"
            :owned="ownedIds.has(featured.id)"
            :pending="pendingId === featured.id"
            @add="handleAdd"
            @open-album="openAlbum"
            @open-artist="openArtist"
          />

          <section
            v-for="(section, index) in sections"
            :key="section.style.id"
            :aria-labelledby="`secao-${section.style.slug}`"
            class="mb-16 border-t border-hairline pt-8 md:mb-20"
          >
            <div class="mb-8 flex items-baseline justify-between gap-4">
              <h2
                :id="`secao-${section.style.slug}`"
                class="font-display text-2xl text-ink md:text-3xl"
              >
                {{ section.style.name }}
              </h2>
              <button
                type="button"
                class="shrink-0 text-sm text-accent transition-colors hover:text-accent-hover
                       hover:underline"
                @click="browseStyle(section.style)"
              >
                Ver todos
                <!-- Sem isto, o leitor de tela anuncia quatro "Ver todos"
                     idênticos e a pessoa não sabe qual é qual. -->
                <span class="sr-only">os discos de {{ section.style.name }}</span>
              </button>
            </div>

            <AlbumGrid
              :variant="index === 0 ? 'editorial' : 'grid'"
              :albums="section.albums"
              :owned-ids="ownedIds"
              :pending-id="pendingId"
              @add="handleAdd"
              @open-album="openAlbum"
              @open-artist="openArtist"
            />
          </section>
        </template>
      </template>
    </main>

    <AppToast :toast="toast" @close="toast = null" />
  </div>
</template>