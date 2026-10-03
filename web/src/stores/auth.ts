import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Profile } from '@/types/catalog'
import * as authService from '@/services/auth'
import { ApiError } from '@/services/http'

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<Profile | null>(null)
  const ready = ref(false)

  const isAuthenticated = computed(() => profile.value !== null)
  const needsOnboarding = computed(
    () => profile.value !== null && !profile.value.hasOnboarded,
  )

  // A promessa é guardada para que chamadas simultâneas compartilhem a mesma
  // verificação. Sem isto, o guard de rota e o App.vue disparariam dois
  // GET /auth/eu no carregamento.
  let verification: Promise<void> | null = null

  /** Verifica a sessão uma única vez por carregamento da página. */
  function load(): Promise<void> {
    if (verification) return verification

    verification = (async () => {
      try {
        profile.value = await authService.fetchMe()
      } catch (error) {
        // 401 é a resposta esperada para visitante, não um problema.
        if (!(error instanceof ApiError && error.needsAuth)) {
          console.warn('Não foi possível verificar a sessão.', error)
        }
        profile.value = null
      } finally {
        ready.value = true
      }
    })()

    return verification
  }

  async function register(input: authService.RegisterInput): Promise<Profile> {
    profile.value = await authService.register(input)
    ready.value = true
    return profile.value
  }

  async function login(input: authService.LoginInput): Promise<Profile> {
    profile.value = await authService.login(input)
    ready.value = true
    return profile.value
  }

  async function logout(): Promise<void> {
    try {
      await authService.logout()
    } finally {
      // Limpa o estado local mesmo se a chamada falhar: para quem clicou em
      // sair, continuar parecendo logada é pior do que um cookie órfão.
      profile.value = null
    }
  }

  /** Chamado ao concluir ou pular o onboarding. */
  function markOnboarded(): void {
    if (profile.value) {
      profile.value = { ...profile.value, hasOnboarded: true }
    }
  }

  function setProfile(next: Profile): void {
    profile.value = next
  }

  return {
    profile,
    ready,
    isAuthenticated,
    needsOnboarding,
    load,
    register,
    login,
    logout,
    markOnboarded,
    setProfile,
  }
})