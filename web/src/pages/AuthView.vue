<script setup lang="ts">
// Entrar e criar conta num cartão centrado — direção A da spec do Figma.
// As duas ações moram na mesma tela porque alternam com um clique; separá-las
// em rotas distintas obrigaria a voltar e navegar de novo.

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormField from '@/components/form/FormField.vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/services/http'

type Mode = 'entrar' | 'criar'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// A rota pode abrir já na aba de cadastro: /entrar?modo=criar. É para onde o
// aviso "Crie sua conta" da home manda a pessoa.
const mode = ref<Mode>(route.query.modo === 'criar' ? 'criar' : 'entrar')

const email = ref('')
const password = ref('')
const displayName = ref('')

const fieldErrors = ref<Record<string, string | null>>({})
const formError = ref<string | null>(null)
const submitting = ref(false)

const isRegistering = computed(() => mode.value === 'criar')

const submitLabel = computed(() => {
  if (submitting.value) return isRegistering.value ? 'Criando conta' : 'Entrando'
  return isRegistering.value ? 'Criar conta' : 'Entrar'
})

// Trocar de aba limpa os erros, mas preserva e-mail e senha: quem errou a
// senha ao entrar e resolveu criar conta não quer digitar tudo de novo.
watch(mode, () => {
  fieldErrors.value = {}
  formError.value = null
})

function switchMode(next: Mode) {
  mode.value = next
  router.replace({ query: next === 'criar' ? { ...route.query, modo: 'criar' } : {} })
}

/** Validação no cliente só para o que não precisa do servidor. */
function validate(): boolean {
  const errors: Record<string, string | null> = {}

  if (!email.value.trim()) {
    errors.email = 'Informe seu e-mail.'
  } else if (!email.value.includes('@')) {
    errors.email = 'Informe um e-mail válido.'
  }

  if (!password.value) {
    errors.password = 'Informe sua senha.'
  } else if (isRegistering.value && password.value.length < 8) {
    errors.password = 'A senha precisa ter pelo menos 8 caracteres.'
  }

  if (isRegistering.value && displayName.value.trim().length < 2) {
    errors.displayName = 'Informe seu nome.'
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submit() {
  formError.value = null
  if (!validate()) return

  submitting.value = true

  try {
    if (isRegistering.value) {
      await auth.register({
        email: email.value.trim(),
        password: password.value,
        displayName: displayName.value.trim(),
      })
      // Conta nova nunca passou pelo onboarding.
      await router.push({ name: 'onboarding' })
      return
    }

    const profile = await auth.login({ email: email.value.trim(), password: password.value })

    if (!profile.hasOnboarded) {
      await router.push({ name: 'onboarding' })
      return
    }

    // Volta para onde a pessoa estava quando esbarrou no login.
    const next = typeof route.query.proximo === 'string' ? route.query.proximo : '/'
    await router.push(next)
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409) {
      // Conflito é sempre e-mail já cadastrado: mostra no campo certo e
      // oferece o caminho de saída em vez de só recusar.
      fieldErrors.value = { email: cause.message }
      formError.value = 'Se esta conta é sua, entre com sua senha.'
    } else {
      formError.value =
        cause instanceof ApiError && cause.kind !== 'server'
          ? cause.message
          : 'Não foi possível concluir agora. Tente de novo em instantes.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-page px-6 py-12">
    <div class="w-full max-w-[400px]">
      <RouterLink to="/" class="mb-8 block text-center font-display text-2xl text-ink">
        Coleciona
      </RouterLink>

      <div class="rounded-card border border-hairline bg-card p-8">
        <div role="tablist" class="mb-6 flex gap-1 border-b border-hairline">
          <button
            v-for="tab in (['entrar', 'criar'] as Mode[])"
            :key="tab"
            role="tab"
            type="button"
            :aria-selected="mode === tab"
            class="-mb-px border-b-2 px-3 pb-3 text-sm transition-colors"
            :class="
              mode === tab
                ? 'border-accent font-medium text-ink'
                : 'border-transparent text-ink-muted hover:text-ink-soft'
            "
            @click="switchMode(tab)"
          >
            {{ tab === 'entrar' ? 'Entrar' : 'Criar conta' }}
          </button>
        </div>

        <h1 class="mb-1 font-display text-2xl text-ink">
          {{ isRegistering ? 'Comece sua coleção' : 'Bem-vinda de volta' }}
        </h1>
        <p class="mb-6 text-[15px] leading-6 text-ink-soft">
          {{
            isRegistering
              ? 'Uma conta para catalogar seus discos e compartilhar a estante.'
              : 'Entre para continuar de onde parou.'
          }}
        </p>

        <!-- novalidate: a validação é nossa, com mensagens em português e no
             lugar certo. A do navegador aparece em balão e não é lida por
             leitor de tela de forma confiável. -->
        <form novalidate class="flex flex-col gap-2" @submit.prevent="submit">
          <FormField
            v-if="isRegistering"
            v-model="displayName"
            label="Como podemos te chamar"
            placeholder="Camila"
            autocomplete="name"
            :error="fieldErrors.displayName"
          />

          <FormField
            v-model="email"
            label="E-mail"
            type="email"
            placeholder="nome@email.com"
            autocomplete="email"
            :error="fieldErrors.email"
          />

          <FormField
            v-model="password"
            label="Senha"
            type="password"
            :autocomplete="isRegistering ? 'new-password' : 'current-password'"
            :hint="isRegistering ? 'Pelo menos 8 caracteres.' : undefined"
            :error="fieldErrors.password"
          />

          <p
            v-if="formError"
            role="alert"
            class="rounded-control bg-accent-wash px-3 py-2 text-[13px] leading-5 text-accent"
          >
            {{ formError }}
          </p>

          <button
            type="submit"
            class="mt-4 h-11 w-full rounded-control bg-accent text-sm font-medium text-white
                   transition-colors hover:bg-accent-hover disabled:opacity-70"
            :disabled="submitting"
            :aria-busy="submitting"
          >
            {{ submitLabel }}
          </button>
        </form>
      </div>

      <p class="mt-6 text-center text-[13px] text-ink-muted">
        <RouterLink to="/" class="underline-offset-4 hover:underline">
          Explorar o catálogo sem conta
        </RouterLink>
      </p>
    </div>
  </div>
</template>