<script setup lang="ts">
// Perguntas de preferência em etapas — direção C da spec do Figma.
// Duas etapas, porque são dois dados que o back-end guarda: estilos e
// artistas. Uma terceira seria tela de boas-vindas, que só aumenta a
// desistência no meio do caminho.

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import StateMessage from '@/components/feedback/StateMessage.vue'
import { useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import { completeOnboarding, fetchOptions, skipOnboarding } from '@/services/onboarding'
import { ApiError } from '@/services/http'
import { describeError } from '@/utils/describeError'

const router = useRouter()
const auth = useAuthStore()

const TOTAL_STEPS = 2
const step = ref(1)

const selectedStyles = ref(new Set<string>())
const selectedArtists = ref(new Set<string>())

const submitting = ref(false)
const formError = ref<string | null>(null)

const options = useAsync((signal) => fetchOptions(signal))

const styles = computed(() => options.data.value?.styles ?? [])
const artists = computed(() => options.data.value?.artists ?? [])

// Pelo menos um estilo: sem nenhum, a personalização não tem o que ordenar e
// o back-end recusa. Melhor travar aqui, com o motivo visível.
const canAdvance = computed(() => step.value !== 1 || selectedStyles.value.size > 0)

onMounted(() => options.run())

// Devolve um Set novo em vez de mutar: o ref não percebe um .add() no mesmo
// objeto. Recebe o valor já desembrulhado, porque o template passa o ref
// destravado — por isso a atribuição fica no template, não aqui.
function toggled(current: Set<string>, id: string): Set<string> {
  const next = new Set(current)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function back() {
  formError.value = null
  step.value = Math.max(1, step.value - 1)
}

async function advance() {
  formError.value = null

  if (step.value < TOTAL_STEPS) {
    step.value += 1
    return
  }

  submitting.value = true

  try {
    await completeOnboarding({
      styleIds: [...selectedStyles.value],
      artistIds: [...selectedArtists.value],
    })
    auth.markOnboarded()
    await router.push('/')
  } catch (cause) {
    formError.value =
      cause instanceof ApiError && cause.kind !== 'server'
        ? cause.message
        : 'Não foi possível salvar agora. Tente de novo em instantes.'
  } finally {
    submitting.value = false
  }
}

/**
 * Pular é saída legítima: a home cai no comportamento padrão. Obrigar a
 * escolher só produz cliques aleatórios, que envenenam a personalização em
 * vez de alimentá-la.
 */
async function skip() {
  submitting.value = true

  try {
    await skipOnboarding()
    auth.markOnboarded()
    await router.push('/')
  } catch {
    formError.value = 'Não foi possível continuar agora. Tente de novo.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-page px-6 py-12">
    <div class="mx-auto w-full max-w-[480px]">
      <div class="mb-8 flex gap-1" role="presentation">
        <div
          v-for="n in TOTAL_STEPS"
          :key="n"
          class="h-[3px] flex-1 rounded-sm transition-colors"
          :class="n <= step ? 'bg-accent' : 'bg-hairline'"
        />
      </div>

      <StateMessage
        v-if="options.error.value"
        v-bind="describeError(options.error.value, 'as opções')"
        action-label="Tentar de novo"
        @action="options.run()"
      />

      <div v-else-if="options.loading.value" aria-busy="true" class="space-y-4">
        <div class="h-4 w-24 animate-pulse rounded bg-inset" />
        <div class="h-8 w-3/4 animate-pulse rounded bg-inset" />
        <div class="h-5 w-2/3 animate-pulse rounded bg-inset" />
        <div class="flex flex-wrap gap-2 pt-4">
          <div v-for="n in 7" :key="n" class="h-9 w-24 animate-pulse rounded-full bg-inset" />
        </div>
      </div>

      <template v-else>
        <p class="mb-2 text-[13px] text-ink-muted">Etapa {{ step }} de {{ TOTAL_STEPS }}</p>

        <!-- ============================== Etapa 1 ============================== -->
        <fieldset v-if="step === 1" class="border-0 p-0">
          <legend class="mb-2 font-display text-[28px] leading-tight text-ink">
            Quais estilos você coleciona?
          </legend>
          <p class="mb-6 text-[15px] leading-6 text-ink-soft">
            Eles sobem para o topo da sua página inicial. Nada desaparece — você continua
            vendo o catálogo inteiro.
          </p>

          <div class="flex flex-wrap gap-2">
            <label
              v-for="style in styles"
              :key="style.id"
              class="cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors
                     has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
                     has-[:focus-visible]:outline-accent"
              :class="
                selectedStyles.has(style.id)
                  ? 'border-accent bg-accent-wash text-accent'
                  : 'border-strong text-ink-soft hover:border-ink-muted'
              "
            >
              <input
                type="checkbox"
                class="sr-only"
                :checked="selectedStyles.has(style.id)"
                @change="selectedStyles = toggled(selectedStyles, style.id)"
              />
              {{ style.name }}
            </label>
          </div>

          <p v-if="!canAdvance" class="mt-4 text-[13px] text-ink-muted">
            Escolha pelo menos um para continuar.
          </p>
        </fieldset>

        <!-- ============================== Etapa 2 ============================== -->
        <fieldset v-else class="border-0 p-0">
          <legend class="mb-2 font-display text-[28px] leading-tight text-ink">
            Algum artista que você já segue?
          </legend>
          <p class="mb-6 text-[15px] leading-6 text-ink-soft">
            Montamos uma seção “Para você” com os discos deles. Pode deixar em branco.
          </p>

          <div v-if="artists.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label
              v-for="artist in artists"
              :key="artist.id"
              class="flex cursor-pointer items-center gap-3 rounded-card border p-2
                     transition-colors has-[:focus-visible]:outline-2
                     has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
              :class="
                selectedArtists.has(artist.id)
                  ? 'border-accent bg-accent-wash'
                  : 'border-hairline hover:border-strong'
              "
            >
              <input
                type="checkbox"
                class="sr-only"
                :checked="selectedArtists.has(artist.id)"
                @change="selectedArtists = toggled(selectedArtists, artist.id)"
              />
              <img
                v-if="artist.imageUrl"
                :src="artist.imageUrl"
                alt=""
                loading="lazy"
                class="size-9 shrink-0 rounded-full bg-inset object-cover"
              />
              <span
                v-else
                class="flex size-9 shrink-0 items-center justify-center rounded-full bg-inset
                       font-display text-sm text-ink-muted"
                aria-hidden="true"
              >
                {{ artist.name.charAt(0) }}
              </span>
              <span
                class="min-w-0 truncate text-[13px] leading-5"
                :class="selectedArtists.has(artist.id) ? 'text-accent' : 'text-ink'"
              >
                {{ artist.name }}
              </span>
            </label>
          </div>

          <p v-else class="text-[15px] text-ink-muted">
            O catálogo ainda não tem artistas suficientes para sugerir. Você pode voltar a
            isto depois, nas configurações do perfil.
          </p>
        </fieldset>

        <p
          v-if="formError"
          role="alert"
          class="mt-6 rounded-control bg-accent-wash px-3 py-2 text-[13px] leading-5 text-accent"
        >
          {{ formError }}
        </p>

        <div class="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="button"
            class="h-11 rounded-control bg-accent px-6 text-sm font-medium text-white
                   transition-colors hover:bg-accent-hover disabled:opacity-70"
            :disabled="!canAdvance || submitting"
            :aria-busy="submitting"
            @click="advance"
          >
            {{ step < TOTAL_STEPS ? 'Continuar' : submitting ? 'Salvando' : 'Concluir' }}
          </button>

          <button
            v-if="step > 1"
            type="button"
            class="h-11 rounded-control px-3 text-sm text-ink-soft transition-colors hover:text-ink"
            @click="back"
          >
            Voltar
          </button>

          <button
            type="button"
            class="ml-auto text-[13px] text-ink-muted underline-offset-4 transition-colors
                   hover:text-ink-soft hover:underline"
            :disabled="submitting"
            @click="skip"
          >
            Pular por agora
          </button>
        </div>
      </template>
    </div>
  </div>
</template>