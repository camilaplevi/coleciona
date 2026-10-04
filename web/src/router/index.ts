import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'inicio',
    component: () => import('@/pages/HomeView.vue'),
  },
  {
    path: '/entrar',
    name: 'entrar',
    component: () => import('@/pages/AuthView.vue'),
    meta: { apenasVisitante: true },
  },
  {
    path: '/confirmar-email',
    name: 'confirmar-email',
    component: () => import('@/pages/ConfirmEmailView.vue'),
    // Pública de propósito: quem clica no link pode estar sem sessão.
    meta: { publica: true },
  },
  {
    path: '/meu-perfil',
    name: 'meu-perfil',
    component: () => import('@/pages/ProfileView.vue'),
    meta: { exigeConta: true },
  },
  {
    path: '/perfis/:username',
    name: 'perfil',
    component: () => import('@/pages/ProfileView.vue'),
    meta: { publica: true },
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/pages/OnboardingView.vue'),
    meta: { exigeConta: true },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Espera a sessão antes de decidir: sem isso, recarregar /onboarding mandaria para a home.
  await auth.load()

  if (to.meta.exigeConta && !auth.isAuthenticated) {
    // `proximo` leva a pessoa de volta para onde ela estava tentando chegar.
    return { name: 'entrar', query: { proximo: to.fullPath } }
  }

  if (to.meta.apenasVisitante && auth.isAuthenticated) {
    return auth.needsOnboarding ? { name: 'onboarding' } : { name: 'inicio' }
  }

  // Onboarding pendente intercepta a navegação, exceto se foi adiado nesta sessão.
  if (
    auth.needsOnboarding &&
    !auth.onboardingDeferred &&
    to.name !== 'onboarding' &&
    !to.meta.publica
  ) {
    return { name: 'onboarding' }
  }

  return true
})