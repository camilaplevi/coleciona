<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  displayName: string
  username: string
  bio: string | null
  avatarUrl: string | null
  memberSince: string
  isPublic: boolean
  /** Mostra o cadeado de privacidade só para quem vê o próprio perfil. */
  showVisibility?: boolean
}>()

/** Iniciais para o avatar, enquanto a pessoa não tem foto. */
const initials = computed(() =>
  props.displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(''),
)

const memberSinceText = computed(() =>
  new Date(props.memberSince).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
)
</script>

<template>
  <header class="flex flex-col gap-6 rounded-card border border-hairline bg-card p-6 sm:flex-row sm:items-center sm:p-8">
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="`Foto de ${displayName}`"
      class="size-24 shrink-0 rounded-full bg-inset object-cover"
    />
    <span
      v-else
      class="flex size-24 shrink-0 items-center justify-center rounded-full bg-inset font-display text-3xl text-ink-soft"
      aria-hidden="true"
    >
      {{ initials }}
    </span>

    <div class="min-w-0 flex-1">
      <h1 class="font-display text-3xl leading-tight text-ink">{{ displayName }}</h1>
      <p class="mt-1 text-[15px] text-ink-muted">@{{ username }}</p>

      <p v-if="bio" class="mt-3 max-w-prose text-[15px] leading-6 text-ink-soft">{{ bio }}</p>

      <p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
        <span>Membro desde {{ memberSinceText }}</span>
        <span
          v-if="showVisibility"
          class="rounded-full px-2.5 py-0.5"
          :class="isPublic ? 'bg-owned-wash text-owned' : 'bg-inset text-ink-soft'"
        >
          {{ isPublic ? 'Perfil público' : 'Perfil privado' }}
        </span>
      </p>
    </div>
  </header>
</template>
