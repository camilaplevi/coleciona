<script lang="ts">
// web/src/components/feedback/StateMessage.vue
export type StateTone = 'error' | 'offline' | 'empty' | 'not-found'
</script>

<script setup lang="ts">
//
// Mensagem que ocupa o lugar do conteúdo quando a página não tem o que
// mostrar: falha ao carregar, sem conexão, busca vazia, catálogo vazio.
// Para falha de uma ação isolada (adicionar um disco), use AppToast.

import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    tone?: StateTone
    title: string
    description?: string
    actionLabel?: string
    /** Versão menor, para dentro de uma seção em vez da página inteira. */
    compact?: boolean
  }>(),
  { tone: 'empty', compact: false },
)

defineEmits<{ action: [] }>()

// Falha é anunciada na hora pelo leitor de tela; estado vazio, não —
// "nenhum resultado" não é urgente e interromper a leitura seria ruído.
const role = computed(() => (props.tone === 'error' || props.tone === 'offline' ? 'alert' : 'status'))

const iconTone = computed(() =>
  props.tone === 'error' ? 'bg-accent-wash text-accent' : 'bg-inset text-ink-soft',
)
</script>

<template>
  <div
    :role="role"
    class="mx-auto flex max-w-md flex-col items-center text-center"
    :class="compact ? 'py-10' : 'py-20 md:py-28'"
  >
    <span
      class="mb-5 flex items-center justify-center rounded-full"
      :class="[iconTone, compact ? 'size-11' : 'size-14']"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        :class="compact ? 'size-5' : 'size-6'"
      >
        <!-- disco: estado vazio -->
        <template v-if="tone === 'empty'">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.5" />
        </template>
        <!-- lupa: nada encontrado -->
        <template v-else-if="tone === 'not-found'">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </template>
        <!-- sinal cortado: sem conexão -->
        <template v-else-if="tone === 'offline'">
          <path d="M5 12.5a10 10 0 0 1 14 0" />
          <path d="M8.5 16a5 5 0 0 1 7 0" />
          <circle cx="12" cy="19.5" r="0.75" fill="currentColor" />
          <path d="M3 3l18 18" />
        </template>
        <!-- alerta: falha -->
        <template v-else>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5" />
          <circle cx="12" cy="16" r="0.75" fill="currentColor" />
        </template>
      </svg>
    </span>

    <h2 class="font-display text-ink" :class="compact ? 'text-xl' : 'text-2xl'">
      {{ title }}
    </h2>

    <p v-if="description" class="mt-2 text-[15px] leading-6 text-ink-soft">
      {{ description }}
    </p>

    <button
      v-if="actionLabel"
      type="button"
      class="mt-6 h-10 rounded-control border border-strong px-5 text-sm font-medium text-ink
             transition-colors hover:border-accent hover:text-accent"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>