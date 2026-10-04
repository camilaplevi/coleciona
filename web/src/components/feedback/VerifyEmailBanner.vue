<script setup lang="ts">
// Aviso enquanto o e-mail não foi confirmado. Não bloqueia a navegação, só o salvamento.

import { ref } from 'vue'
import { resendConfirmation } from '@/services/auth'
import { ApiError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const sending = ref(false)
const feedback = ref<string | null>(null)

async function resend() {
  sending.value = true
  feedback.value = null

  try {
    await resendConfirmation()
    feedback.value = 'Enviamos um novo link. Confira sua caixa de entrada.'
  } catch (cause) {
    // 429 chega aqui com a mensagem de espera, em português.
    feedback.value =
      cause instanceof ApiError ? cause.message : 'Não foi possível reenviar agora.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div v-if="auth.needsVerification" class="border-b border-accent bg-accent-wash">
    <div class="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
      <p class="flex-1 text-sm leading-5 text-accent">
        Confirme seu e-mail para salvar discos na sua coleção. Enviamos um link quando você
        criou a conta.
      </p>

      <p v-if="feedback" role="status" class="text-sm text-ink-soft">{{ feedback }}</p>

      <button
        type="button"
        class="text-sm font-medium text-accent underline underline-offset-4 disabled:opacity-70"
        :disabled="sending"
        @click="resend"
      >
        {{ sending ? 'Enviando' : 'Reenviar e-mail' }}
      </button>
    </div>
  </div>
</template>
