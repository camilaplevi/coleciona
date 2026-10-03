<script setup lang="ts">
// Campo com rótulo e erro, nas medidas da spec do Figma: rótulo acima em
// ui/label, campo de 44px, raio 6, borda hairline.

import { useId } from 'vue'

const props = defineProps<{
  label: string
  type?: 'text' | 'email' | 'password'
  /** Mensagem de erro do campo. Nulo quando está válido. */
  error?: string | null
  hint?: string
  placeholder?: string
  autocomplete?: string
  required?: boolean
}>()

const model = defineModel<string>({ required: true })

const id = useId()
const errorId = `${id}-erro`
const hintId = `${id}-dica`
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-[13px] font-medium text-ink-soft">
      {{ label }}
    </label>

    <input
      :id="id"
      v-model="model"
      :type="props.type ?? 'text'"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined"
      class="h-11 w-full rounded-control border bg-page px-3 text-[15px] text-ink
             placeholder:text-ink-muted"
      :class="error ? 'border-accent' : 'border-hairline'"
    />

    <!-- O erro fica dentro de um aria-live permanente para o leitor de tela
         anunciar a mudança; um nó que nasce junto com a mensagem não é
         percebido. -->
    <p :id="errorId" aria-live="polite" class="min-h-0 text-[13px] text-accent">
      {{ error ?? '' }}
    </p>

    <p v-if="hint && !error" :id="hintId" class="text-[13px] text-ink-muted">
      {{ hint }}
    </p>
  </div>
</template>