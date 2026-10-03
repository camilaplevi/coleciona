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

  // Espera a verificação de sessão antes de decidir. Sem isto, recarregar a
  // página em /onboarding redirecionaria para a home, porque no primeiro
  // instante a store ainda não sabe que existe sessão.
  await auth.load()

  if (to.meta.exigeConta && !auth.isAuthenticated) {
    // `proximo` leva a pessoa de volta para onde ela estava tentando chegar.
    return { name: 'entrar', query: { proximo: to.fullPath } }
  }

  if (to.meta.apenasVisitante && auth.isAuthenticated) {
    return auth.needsOnboarding ? { name: 'onboarding' } : { name: 'inicio' }
  }

  // Onboarding pendente intercepta a navegação uma única vez. Quem pulou tem
  // hasOnboarded true, então não cai mais aqui — pular precisa ser definitivo.
  if (auth.needsOnboarding && to.name !== 'onboarding') {
    return { name: 'onboarding' }
  }

  return true
})