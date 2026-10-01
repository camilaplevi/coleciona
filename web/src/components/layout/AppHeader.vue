<script setup lang="ts">
// web/src/components/layout/AppHeader.vue
//
// Cabeçalho compartilhado por todas as telas. Mesma estrutura da spec do
// Figma: marca, navegação, busca e ações de conta.

const search = defineModel<string>('search', { default: '' })

defineEmits<{
  auth: []
  openCollection: []
}>()
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-hairline bg-card"
    style="padding-top: env(safe-area-inset-top)"
  >
    <div class="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-6 md:gap-8">
      <a href="/" class="shrink-0 font-display text-xl text-ink">Coleciona</a>

      <nav aria-label="Principal" class="hidden h-16 items-center gap-6 text-sm md:flex">
        <a
          href="/"
          aria-current="page"
          class="flex h-full items-center border-b-2 border-accent text-ink"
        >
          Explorar
        </a>
        <button
          type="button"
          class="flex h-full items-center border-b-2 border-transparent text-ink-soft
                 transition-colors hover:text-ink"
          @click="$emit('openCollection')"
        >
          Minha coleção
        </button>
      </nav>

      <div class="relative min-w-0 flex-1">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <input
          v-model="search"
          type="search"
          aria-label="Buscar por artista, álbum ou gravadora"
          placeholder="Buscar artista, álbum ou gravadora"
          class="h-10 w-full rounded-full border border-hairline bg-page pl-9 pr-4 text-[15px]
                 text-ink placeholder:text-ink-muted"
        />
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          class="hidden h-10 rounded-control px-3 text-sm text-ink-soft transition-colors
                 hover:text-ink sm:block"
          @click="$emit('auth')"
        >
          Entrar
        </button>
        <button
          type="button"
          class="h-10 rounded-control bg-accent px-4 text-sm font-medium text-white
                 transition-colors hover:bg-accent-hover"
          @click="$emit('auth')"
        >
          Criar conta
        </button>
      </div>
    </div>
  </header>
</template>