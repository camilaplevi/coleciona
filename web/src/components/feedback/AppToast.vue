<script lang="ts">
// web/src/components/feedback/AppToast.vue
export interface Toast {
  message: string
  tone: 'info' | 'error'
  actionLabel?: string
  action?: () => void
}
</script>

<script setup lang="ts">
//
// Aviso discreto no rodapé para o resultado de uma ação: "precisa de conta",
// "não foi possível adicionar". A página continua válida, então a mensagem
// não toma o lugar do conteúdo.

import { onBeforeUnmount, onMounted, watch } from 'vue'

const props = defineProps<{ toast: Toast | null }>()
const emit = defineEmits<{ close: [] }>()

// Aviso sem ação some sozinho. Aviso COM ação fica até a pessoa decidir:
// fazer um botão desaparecer enquanto alguém ainda está lendo viola o
// critério de tempo ajustável da WCAG (2.2.1).
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.toast,
  (toast) => {
    clearTimeout(timer)
    if (toast && !toast.actionLabel) {
      timer = setTimeout(() => emit('close'), 5000)
    }
  },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.toast) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(timer)
})

function runAction() {
  props.toast?.action?.()
  emit('close')
}
</script>

<template>
  <!-- A região aria-live fica sempre montada. Se ela nascesse junto com a
       mensagem, o leitor de tela não perceberia a mudança e não anunciaria. -->
  <div
    aria-live="polite"
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4"
    style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom))"
  >
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-3 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-3 opacity-0"
    >
      <div
        v-if="toast"
        class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card
               bg-ink py-3 pl-4 pr-2 text-card"
      >
        <svg
          v-if="toast.tone === 'error'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          class="size-5 shrink-0 text-accent-wash"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5" />
          <circle cx="12" cy="16" r="0.75" fill="currentColor" />
        </svg>

        <p class="flex-1 text-sm leading-5">{{ toast.message }}</p>

        <button
          v-if="toast.actionLabel"
          type="button"
          class="shrink-0 rounded-control px-3 py-2 text-sm font-medium text-accent-wash
                 underline-offset-4 hover:underline"
          @click="runAction"
        >
          {{ toast.actionLabel }}
        </button>

        <button
          type="button"
          class="flex size-9 shrink-0 items-center justify-center rounded-control
                 text-card/70 hover:text-card"
          aria-label="Fechar aviso"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
               stroke-linecap="round" class="size-4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>