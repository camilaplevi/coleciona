import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Profile } from '@/types/catalog'
import * as authService from '@/services/auth'
import { ApiError } from '@/services/http'

// Flag de onboarding adiado: vale só na aba, então recarregar não reabre o onboarding à força.
const DEFERRED_KEY = 'coleciona:onboarding-adiado'

function readDeferred(): boolean {
  try {
    return sessionStorage.getItem(DEFERRED_KEY) === '1'
  } catch {
    // Sem a flag, o pior caso é o onboarding reaparecer, nunca uma tela presa.
    return false
  }
}

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<Profile | null>(null)
  const ready = ref(false)
  const onboardingDeferred = ref(readDeferred())

  const isAuthenticated = computed(() => profile.value !== null)
  const needsVerification = computed(
    () => profile.value !== null && !profile.value.emailVerified,
  )
  const needsOnboarding = computed(
    () => profile.value !== null && !profile.value.hasOnboarded,
  )

  // Promessa compartilhada: o guard de rota e o App não disparam dois GET /auth/eu.
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
      // Limpa o estado mesmo se a chamada falhar: parecer logada é pior que um cookie órfão.
      profile.value = null
      onboardingDeferred.value = false
      try {
        sessionStorage.removeItem(DEFERRED_KEY)
      } catch {
      }
    }
  }

  /** Sai do onboarding sem responder. Não marca nada no servidor. */
  function deferOnboarding(): void {
    onboardingDeferred.value = true
    try {
      sessionStorage.setItem(DEFERRED_KEY, '1')
    } catch {
      // Sem storage, vale só nesta tela.
    }
  }

  /** Chamado ao concluir ou pular o onboarding. */
  function markOnboarded(): void {
    if (profile.value) {
      profile.value = { ...profile.value, hasOnboarded: true }
    }
  }

  /** Chamado ao confirmar o e-mail, sem precisar buscar a sessão de novo. */
  function markVerified(): void {
    if (profile.value) {
      profile.value = { ...profile.value, emailVerified: true }
    }
  }

  function setProfile(next: Profile): void {
    profile.value = next
  }

  return {
    profile,
    ready,
    isAuthenticated,
    needsVerification,
    needsOnboarding,
    onboardingDeferred,
    deferOnboarding,
    load,
    register,
    login,
    logout,
    markOnboarded,
    markVerified,
    setProfile,
  }
})