<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AlbumGrid from '@/components/Albumgrid.vue'
import { useAsync } from '@/composables/useAsync'
import { fetchAlbums, fetchHome } from '@/services/catalog'
import { addToCollection } from '@/services/collection'
import { ApiError } from '@/services/http'

const searchTerm = ref('')
const isSearching = computed(() => searchTerm.value.trim().length > 0)

const home = useAsync((signal) => fetchHome(signal))
const results = useAsync((signal) => fetchAlbums({ search: searchTerm.value.trim() }, signal))

/** Ids já na coleção. Set porque o AlbumGrid consulta uma vez por card. */
const featured = computed(() => home.data.value?.featured ?? null)
const sections = computed(() => home.data.value?.sections ?? [])

const ownedIds = ref(new Set<string>())
const pendingId = ref<string | null>(null)
const authPrompt = ref(false)
const feedback = ref<string | null>(null)

function absorbOwned(ids: string[] | undefined) {
  if (!ids?.length) return
  ownedIds.value = new Set([...ownedIds.value, ...ids])
}

watch(() => home.data.value, (payload) => absorbOwned(payload?.ownedAlbumIds))
watch(() => results.data.value, (payload) => absorbOwned(payload?.ownedAlbumIds))

// Sem debounce, cada tecla vira uma requisição. 300ms é o intervalo em que
// uma pausa na digitação já parece intencional.
let timer: ReturnType<typeof setTimeout> | undefined
watch(searchTerm, () => {
  clearTimeout(timer)
  if (!isSearching.value) return
  timer = setTimeout(() => results.run(), 300)
})

onMounted(() => home.run())

async function handleAdd(albumId: string) {
  pendingId.value = albumId
  feedback.value = null

  try {
    await addToCollection(albumId)
    // Atribuir um Set novo em vez de mutar: shallow refs não reagem a .add().
    ownedIds.value = new Set([...ownedIds.value, albumId])
  } catch (cause) {
    // O servidor é quem decide se há sessão. O front só reage ao 401 — assim
    // não existe estado em que o botão pareça habilitado e não funcione.
    if (cause instanceof ApiError && cause.needsAuth) {
      authPrompt.value = true
    } else {
      feedback.value = cause instanceof Error ? cause.message : 'Não foi possível adicionar.'
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
    <header class="border-b border-hairline bg-card">
      <div class="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-4">
        <span class="font-display text-xl">Coleciona</span>

        <div class="flex-1">
          <label for="busca" class="sr-only">Buscar por artista, álbum, gravadora ou ano</label>
          <input
            id="busca"
            v-model="searchTerm"
            type="search"
            placeholder="Artista, álbum, gravadora ou ano"
            class="h-10 w-full rounded-full border border-hairline bg-page px-4 text-[15px]
                   text-ink placeholder:text-ink-muted"
          />
        </div>

        <button
          type="button"
          class="h-10 shrink-0 rounded-control bg-accent px-4 text-sm font-medium text-white
                 hover:bg-accent-hover"
          @click="authPrompt = true"
        >
          Criar conta
        </button>
      </div>
    </header>

    <!-- O convite ao cadastro só aparece depois de uma tentativa real de
         interagir. Banner de entrada antes de a pessoa ver o acervo é o que
         faz visitante fechar a aba. -->
    <div
      v-if="authPrompt"
      class="border-b border-accent bg-accent-wash"
      role="status"
    >
      <div class="mx-auto flex max-w-[1200px] items-center gap-4 px-6 py-3">
        <p class="flex-1 text-sm text-accent">
          Crie sua conta para montar sua coleção. Leva menos de um minuto.
        </p>
        <button type="button" class="text-sm underline" @click="authPrompt = false">
          Agora não
        </button>
      </div>
    </div>

    <main class="mx-auto max-w-[1200px] px-6 py-10">
      <p
        v-if="feedback"
        class="mb-6 rounded-card border border-hairline bg-card px-4 py-3 text-sm text-ink-soft"
        role="status"
      >
        {{ feedback }}
      </p>

      <!-- Resultados de busca -->
      <section v-if="isSearching">
        <h1 class="mb-6 font-display text-2xl">
          Resultados para “{{ searchTerm.trim() }}”
        </h1>

        <p v-if="results.error.value" class="text-[15px] text-ink-soft">
          {{ results.error.value }}
          <button type="button" class="ml-2 text-accent underline" @click="results.run()">
            Tentar de novo
          </button>
        </p>

        <AlbumGrid
          v-else
          :albums="results.data.value?.items ?? []"
          :owned-ids="ownedIds"
          :pending-id="pendingId"
          :loading="results.loading.value"
          :skeleton-count="10"
          empty-message="Nenhum disco encontrado. Tente outro termo."
          @add="handleAdd"
          @open-album="openAlbum"
          @open-artist="openArtist"
        ></AlbumGrid>
      </section>

      <!-- Página inicial -->
      <template v-else>
        <p v-if="home.error.value" class="text-[15px] text-ink-soft">
          {{ home.error.value }}
          <button type="button" class="ml-2 text-accent underline" @click="home.run()">
            Tentar de novo
          </button>
        </p>

        <template v-else>
          <section v-if="featured" class="mb-12 flex flex-wrap gap-10">
            <div class="h-[280px] w-[280px] shrink-0 rounded-cover bg-inset"></div>
            <div class="min-w-[280px] flex-1">
              <p class="mb-2 text-xs text-ink-muted">Destaque</p>
              <h1 class="mb-2 font-display text-4xl leading-tight">
                {{ featured.title }}
              </h1>
              <p class="mb-6 text-[15px] text-ink-soft">
                {{ featured.primaryArtist?.name ?? 'Vários artistas' }}
                <template v-if="featured.label">
                  — {{ featured.label }}, {{ featured.releaseYear }}
                </template>
              </p>
              <button
                type="button"
                class="h-11 rounded-control bg-accent px-5 text-sm font-medium text-white
                       hover:bg-accent-hover"
                @click="handleAdd(featured.id)"
              >
                Adicionar à coleção
              </button>
            </div>
          </section>

          <div v-if="home.loading.value" class="space-y-12">
            <AlbumGrid :albums="[]" loading :skeleton-count="5"></AlbumGrid>
          </div>

          <section
            v-for="section in sections"
            :key="section.style.id"
            class="mb-12"
          >
            <h2 class="mb-6 font-display text-2xl">{{ section.style.name }}</h2>
            <AlbumGrid
              :albums="section.albums"
              :owned-ids="ownedIds"
              :pending-id="pendingId"
              @add="handleAdd"
              @open-album="openAlbum"
              @open-artist="openArtist"
            ></AlbumGrid>
          </section>

          <p
            v-if="!home.loading.value && !sections.length"
            class="py-12 text-center text-[15px] text-ink-muted"
          >
            O catálogo ainda está vazio. Rode <code>npx tsx prisma/seed.ts</code> na pasta
            <code>api</code> para popular.
          </p>
        </template>
      </template>
    </main>
  </div>
</template>