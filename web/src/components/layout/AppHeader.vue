<script setup lang="ts">
// web/src/components/layout/AppHeader.vue
//
// Cabeçalho compartilhado. Mesma estrutura da spec do Figma — marca,
// navegação, busca e ações de conta — com as duas variantes previstas lá:
// visitante e autenticado.

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const search = defineModel<string>('search', { default: '' })

const router = useRouter()
const auth = useAuthStore()

const menuOpen = ref(false)

/** Iniciais para o avatar, enquanto não há upload de imagem. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

async function signOut() {
  menuOpen.value = false
  await auth.logout()
  await router.push('/')
}
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-hairline bg-card"
    style="padding-top: env(safe-area-inset-top)"
  >
    <div class="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-6 md:gap-8">
      <RouterLink to="/" class="shrink-0 font-display text-xl text-ink">Coleciona</RouterLink>

      <nav aria-label="Principal" class="hidden h-16 items-center gap-6 text-sm md:flex">
        <RouterLink
          to="/"
          class="flex h-full items-center border-b-2 border-transparent text-ink-soft
                 transition-colors hover:text-ink"
          active-class="border-accent text-ink"
        >
          Explorar
        </RouterLink>

        <!-- O link da coleção só existe com conta: para visitante ele levaria
             a um 404 ou a um login disfarçado de navegação. -->
        <RouterLink
          v-if="auth.isAuthenticated && auth.profile"
          :to="`/perfis/${auth.profile.username}`"
          class="flex h-full items-center border-b-2 border-transparent text-ink-soft
                 transition-colors hover:text-ink"
          active-class="border-accent text-ink"
        >
          Minha coleção
        </RouterLink>
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

      <!-- Autenticado -->
      <div v-if="auth.isAuthenticated && auth.profile" class="relative shrink-0">
        <button
          type="button"
          class="flex size-9 items-center justify-center rounded-full bg-inset text-[13px]
                 font-medium text-ink-soft transition-colors hover:text-ink"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          :aria-label="`Conta de ${auth.profile.displayName}`"
          @click="menuOpen = !menuOpen"
        >
          {{ initials(auth.profile.displayName) }}
        </button>

        <!-- Camada que fecha o menu ao clicar fora. Um listener global em
             document faria o mesmo, mas vazaria se o componente sair da
             árvore antes do cleanup. -->
        <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />

        <div
          v-if="menuOpen"
          role="menu"
          class="absolute right-0 top-11 z-50 w-56 rounded-card border border-hairline
                 bg-card py-1"
        >
          <p class="border-b border-hairline px-4 pb-3 pt-2">
            <span class="block truncate text-sm font-medium text-ink">
              {{ auth.profile.displayName }}
            </span>
            <span class="block truncate text-[13px] text-ink-muted">
              /{{ auth.profile.username }}
            </span>
          </p>

          <RouterLink
            :to="`/perfis/${auth.profile.username}`"
            role="menuitem"
            class="block px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-inset
                   hover:text-ink"
            @click="menuOpen = false"
          >
            Minha coleção
          </RouterLink>

          <RouterLink
            to="/onboarding"
            role="menuitem"
            class="block px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-inset
                   hover:text-ink"
            @click="menuOpen = false"
          >
            Meus estilos e artistas
          </RouterLink>

          <button
            type="button"
            role="menuitem"
            class="block w-full px-4 py-2.5 text-left text-sm text-ink-soft transition-colors
                   hover:bg-inset hover:text-ink"
            @click="signOut"
          >
            Sair
          </button>
        </div>
      </div>

      <!-- Visitante -->
      <div v-else class="flex shrink-0 items-center gap-1">
        <RouterLink
          to="/entrar"
          class="hidden h-10 items-center rounded-control px-3 text-sm text-ink-soft
                 transition-colors hover:text-ink sm:flex"
        >
          Entrar
        </RouterLink>
        <RouterLink
          :to="{ name: 'entrar', query: { modo: 'criar' } }"
          class="flex h-10 items-center rounded-control bg-accent px-4 text-sm font-medium
                 text-white transition-colors hover:bg-accent-hover"
        >
          Criar conta
        </RouterLink>
      </div>
    </div>
  </header>
</template>