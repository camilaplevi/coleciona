<script setup lang="ts">
// Fora do guard de sessão: quem clica no link pode estar em outro navegador, sem login.

import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { confirmEmail, resendConfirmation } from '@/services/auth'
import { ApiError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

type Status = 'confirmando' | 'confirmado' | 'erro'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const status = ref<Status>('confirmando')
const message = ref<string | null>(null)
const resending = ref(false)

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''

  if (!token) {
    status.value = 'erro'
    message.value = 'Este link está incompleto. Abra o link inteiro que chegou no e-mail.'
    return
  }

  try {
    await confirmEmail(token)
    auth.markVerified()
    status.value = 'confirmado'
  } catch (cause) {
    status.value = 'erro'
    message.value =
      cause instanceof ApiError && cause.kind !== 'server'
        ? cause.message
        : 'Não foi possível confirmar agora. Tente de novo em instantes.'
  }
})

async function resend() {
  resending.value = true
  try {
    await resendConfirmation()
    message.value = 'Enviamos um novo link. Confira sua caixa de entrada.'
  } catch (cause) {
    message.value =
      cause instanceof ApiError ? cause.message : 'Não foi possível reenviar agora.'
  } finally {
    resending.value = false
  }
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-page px-6 py-12">
    <div class="w-full max-w-[400px] text-center">
      <RouterLink to="/" class="mb-8 block font-display text-2xl text-ink">Coleciona</RouterLink>

      <div class="rounded-card border border-hairline bg-card p-8">
        <p v-if="status === 'confirmando'" aria-busy="true" class="text-[15px] text-ink-soft">
          Confirmando seu e-mail…
        </p>

        <template v-else-if="status === 'confirmado'">
          <h1 class="mb-2 font-display text-2xl text-ink">E-mail confirmado</h1>
          <p class="mb-6 text-[15px] leading-6 text-ink-soft">
            Sua conta está ativa. Agora você já pode salvar discos na sua coleção.
          </p>
          <button
            type="button"
            class="h-11 w-full rounded-control bg-accent text-sm font-medium text-white
                   transition-colors hover:bg-accent-hover"
            @click="goHome"
          >
            Ir para o catálogo
          </button>
        </template>

        <template v-else>
          <h1 class="mb-2 font-display text-2xl text-ink">Não foi possível confirmar</h1>
          <p role="alert" class="mb-6 text-[15px] leading-6 text-ink-soft">{{ message }}</p>

          <button
            v-if="auth.isAuthenticated"
            type="button"
            class="h-11 w-full rounded-control border border-strong text-sm font-medium text-ink
                   transition-colors hover:border-accent hover:text-accent disabled:opacity-70"
            :disabled="resending"
            @click="resend"
          >
            {{ resending ? 'Enviando' : 'Pedir um novo link' }}
          </button>
          <RouterLink
            v-else
            to="/entrar"
            class="block text-sm text-accent underline-offset-4 hover:underline"
          >
            Entrar na minha conta
          </RouterLink>
        </template>
      </div>
    </div>
  </div>
</template>
