<script setup lang="ts">
// Manda só o que mudou: salvar sem alterações não grava nada.

import { computed, reactive, ref } from 'vue'
import AvatarUpload from '@/components/profile/AvatarUpload.vue'
import FormField from '@/components/form/FormField.vue'
import { updateMyAccount } from '@/services/profile'
import { ApiError } from '@/services/http'
import type { AccountUpdate, MyAccount } from '@/types/profile'

const props = defineProps<{ account: MyAccount }>()
const emit = defineEmits<{
  saved: [account: MyAccount]
  avatarChanged: [avatarUrl: string | null]
}>()

const BIO_MAX = 280

const original = {
  displayName: props.account.displayName,
  username: props.account.username,
  bio: props.account.bio ?? '',
  isPublic: props.account.isPublic,
}

const form = reactive({ ...original })
const errors = reactive<Record<string, string | null>>({})
const formError = ref<string | null>(null)
const feedback = ref<string | null>(null)
const submitting = ref(false)

const bioLeft = computed(() => BIO_MAX - form.bio.length)

/** Validação local só para o que não precisa do servidor. */
function validate(): boolean {
  errors.displayName = null
  errors.username = null
  errors.bio = null

  const name = form.displayName.trim()
  if (name.length < 2 || name.length > 60) errors.displayName = 'O nome precisa ter entre 2 e 60 caracteres.'

  if (!/^[a-z0-9_-]{3,30}$/.test(form.username)) {
    errors.username = 'Use de 3 a 30 letras minúsculas, números, hífen ou sublinhado.'
  }

  if (form.bio.length > BIO_MAX) errors.bio = `A bio pode ter até ${BIO_MAX} caracteres.`

  return Object.values(errors).every((value) => !value)
}

function changes(): AccountUpdate {
  const out: AccountUpdate = {}
  if (form.displayName.trim() !== original.displayName) out.displayName = form.displayName.trim()
  if (form.username !== original.username) out.username = form.username
  if (form.bio.trim() !== original.bio) out.bio = form.bio.trim() || null
  if (form.isPublic !== original.isPublic) out.isPublic = form.isPublic
  return out
}

async function submit() {
  formError.value = null
  feedback.value = null
  if (!validate()) return

  const patch = changes()
  if (!Object.keys(patch).length) {
    feedback.value = 'Nada mudou ainda.'
    return
  }

  submitting.value = true
  try {
    const saved = await updateMyAccount(patch)
    Object.assign(original, {
      displayName: saved.displayName,
      username: saved.username,
      bio: saved.bio ?? '',
      isPublic: saved.isPublic,
    })
    feedback.value = 'Alterações salvas.'
    emit('saved', saved)
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409) {
      errors.username = cause.message
    } else {
      formError.value =
        cause instanceof ApiError && cause.kind !== 'server'
          ? cause.message
          : 'Não foi possível salvar agora. Tente de novo em instantes.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form novalidate class="rounded-card border border-hairline bg-card p-6 sm:p-8" @submit.prevent="submit">
    <h2 class="font-display text-xl text-ink">Dados da conta</h2>
    <p class="mb-6 mt-1 text-[13px] text-ink-muted">
      O e-mail não muda por aqui. Ele é o que você usa para entrar.
    </p>

    <AvatarUpload
      class="mb-8"
      :name="account.displayName"
      :avatar-url="account.avatarUrl"
      @changed="emit('avatarChanged', $event)"
    />

    <div class="grid gap-5 sm:grid-cols-2">
      <FormField
        v-model="form.displayName"
        label="Nome de exibição"
        autocomplete="name"
        :error="errors.displayName"
      />
      <FormField
        v-model="form.username"
        label="Endereço do perfil"
        :hint="`Seu perfil fica em /perfis/${form.username || 'seu-endereco'}`"
        :error="errors.username"
      />
    </div>

    <div class="mt-5 flex flex-col gap-1.5">
      <label for="bio" class="text-[13px] font-medium text-ink-soft">Bio</label>
      <textarea
        id="bio"
        v-model="form.bio"
        rows="3"
        class="w-full resize-y rounded-control border bg-page px-3 py-2 text-[15px] leading-6 text-ink placeholder:text-ink-muted"
        :class="errors.bio ? 'border-accent' : 'border-hairline'"
        placeholder="Conte o que você coleciona e o que está procurando."
        :aria-invalid="errors.bio ? 'true' : undefined"
        :aria-describedby="errors.bio ? 'bio-erro' : 'bio-contagem'"
      />
      <p class="flex justify-between text-[13px]">
        <span id="bio-erro" class="text-accent">{{ errors.bio ?? '' }}</span>
        <span id="bio-contagem" class="text-ink-muted">{{ bioLeft }} caracteres restantes</span>
      </p>
    </div>

    <label class="mt-6 flex cursor-pointer items-start gap-3">
      <input v-model="form.isPublic" type="checkbox" class="mt-1 size-4 accent-[var(--color-accent)]" />
      <span>
        <span class="block text-[15px] text-ink">Perfil público</span>
        <span class="block text-[13px] leading-5 text-ink-muted">
          Quem tiver o endereço do seu perfil vê sua coleção e os rankings. Desligado, só você vê.
        </span>
      </span>
    </label>

    <p
      v-if="formError"
      role="alert"
      class="mt-6 rounded-control bg-accent-wash px-3 py-2 text-[13px] leading-5 text-accent"
    >
      {{ formError }}
    </p>

    <div class="mt-6 flex items-center gap-4">
      <button
        type="submit"
        class="h-11 rounded-control bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
        :disabled="submitting"
        :aria-busy="submitting"
      >
        {{ submitting ? 'Salvando' : 'Salvar alterações' }}
      </button>
      <p v-if="feedback" role="status" class="text-[13px] text-ink-soft">{{ feedback }}</p>
    </div>
  </form>
</template>
