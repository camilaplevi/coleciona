<script setup lang="ts">
// Foto escolhida do próprio computador. O navegador recorta o centro e reduz
// para 256px antes de enviar: a foto cabe no limite do servidor e não carrega
// o arquivo original.

import { computed, ref } from 'vue'
import { removeAvatar, uploadAvatar } from '@/services/profile'
import { ApiError } from '@/services/http'

const props = defineProps<{
  name: string
  avatarUrl: string | null
}>()

const emit = defineEmits<{
  changed: [avatarUrl: string | null]
}>()

const SIZE = 256
const MAX_INPUT_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

const busy = ref(false)
const message = ref<string | null>(null)
const error = ref<string | null>(null)

const initials = computed(() =>
  props.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(''),
)

async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  message.value = null
  error.value = null

  if (!ACCEPTED.includes(file.type)) {
    error.value = 'Escolha uma imagem JPEG, PNG ou WebP.'
    return
  }
  if (file.size > MAX_INPUT_BYTES) {
    error.value = 'A foto precisa ter até 10 MB.'
    return
  }

  busy.value = true
  try {
    const saved = await uploadAvatar(await squareJpeg(file))
    message.value = 'Foto atualizada.'
    emit('changed', saved.avatarUrl)
  } catch (cause) {
    error.value =
      cause instanceof ApiError && cause.kind !== 'server'
        ? cause.message
        : 'Não foi possível salvar a foto agora. Tente de novo em instantes.'
  } finally {
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  message.value = null
  error.value = null
  try {
    await removeAvatar()
    message.value = 'Foto removida.'
    emit('changed', null)
  } catch {
    error.value = 'Não foi possível remover a foto agora.'
  } finally {
    busy.value = false
  }
}

/** Recorte central em quadrado, reduzido para SIZE px, em JPEG. Fundo branco para PNG com transparência. */
function squareJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file)

  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)

      if (!ctx) {
        reject(new Error('canvas indisponível'))
        return
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, SIZE, SIZE)
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        SIZE,
        SIZE,
      )
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('imagem ilegível'))
    }

    img.src = url
  }).catch((): never => {
    throw new ApiError(400, 'Não consegui abrir essa imagem. Tente outra foto.')
  })
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      alt=""
      class="size-24 shrink-0 rounded-full bg-inset object-cover"
    />
    <span
      v-else
      class="flex size-24 shrink-0 items-center justify-center rounded-full bg-inset font-display text-3xl text-ink-soft"
      aria-hidden="true"
    >
      {{ initials }}
    </span>

    <div class="flex flex-col gap-2">
      <p class="text-[15px] text-ink">Foto de perfil</p>
      <p class="text-[13px] text-ink-muted">JPEG, PNG ou WebP. Ela é recortada em quadrado.</p>

      <div class="flex flex-wrap items-center gap-3">
        <label
          class="inline-flex h-10 cursor-pointer items-center rounded-control border border-strong px-4 text-sm text-ink transition-colors hover:border-accent hover:text-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
          :class="busy ? 'pointer-events-none opacity-70' : ''"
        >
          {{ busy ? 'Salvando foto' : 'Escolher foto' }}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="sr-only"
            :disabled="busy"
            @change="onFileChosen"
          />
        </label>

        <button
          v-if="avatarUrl"
          type="button"
          class="h-10 px-2 text-sm text-ink-soft transition-colors hover:text-accent"
          :disabled="busy"
          @click="remove"
        >
          Remover foto
        </button>
      </div>

      <p v-if="error" role="alert" class="text-[13px] text-accent">{{ error }}</p>
      <p v-else-if="message" role="status" class="text-[13px] text-ink-soft">{{ message }}</p>
    </div>
  </div>
</template>
