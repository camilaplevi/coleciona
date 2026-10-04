<script setup lang="ts">
// Dashboard da coleção para qualquer visitante. O dono ganha a aba de dados da conta.

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import StateMessage from '@/components/feedback/StateMessage.vue'
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import StatTiles from '@/components/profile/StatTiles.vue'
import RankingCard from '@/components/profile/RankingCard.vue'
import AccountForm from '@/components/profile/AccountForm.vue'
import { useAsync } from '@/composables/useAsync'
import { fetchMyAccount, fetchPublicProfile } from '@/services/profile'
import { describeError } from '@/utils/describeError'
import { useAuthStore } from '@/stores/auth'
import type { MyAccount } from '@/types/profile'

const route = useRoute()
const auth = useAuthStore()

type Tab = 'colecao' | 'conta'
const tab = ref<Tab>('colecao')

/** Em /meu-perfil o endereço vem da sessão; em /perfis/:username, da URL. */
const username = computed(() => {
  const param = route.params.username
  if (typeof param === 'string' && param) return param
  return auth.profile?.username ?? ''
})

const profile = useAsync((signal) => fetchPublicProfile(username.value, signal))
const account = useAsync((signal) => fetchMyAccount(signal))

/** Dono da página: a aba de conta só existe para quem está vendo o próprio perfil. */
const isOwner = computed(() => {
  const data = profile.data.value
  return data?.profile.isOwner === true
})

const ready = computed(() => profile.data.value !== null)

watch(
  username,
  (name) => {
    if (name) {
      tab.value = 'colecao'
      profile.run()
    }
  },
)

watch(isOwner, (owner) => {
  if (owner) account.run()
  else tab.value = 'colecao'
})

onMounted(() => profile.run())

function onSaved(saved: MyAccount) {
  // Mantém o cabeçalho do app e o perfil desta tela em sincronia.
  if (auth.profile) {
    auth.setProfile({ ...auth.profile, displayName: saved.displayName, username: saved.username, isPublic: saved.isPublic })
  }
  account.data.value = saved
  profile.run()
}

function onAvatarChanged(avatarUrl: string | null) {
  if (account.data.value) account.data.value = { ...account.data.value, avatarUrl }
  if (auth.profile) auth.setProfile({ ...auth.profile, avatarUrl })
  profile.run()
}

const stats = computed(() => profile.data.value?.stats)
</script>

<template>
  <div class="min-h-screen bg-page">
    <AppHeader />

    <main class="mx-auto max-w-[1200px] px-6 pb-20 pt-10 md:pt-14">
      <StateMessage
        v-if="profile.error.value"
        v-bind="describeError(profile.error.value, 'este perfil')"
        action-label="Tentar de novo"
        @action="profile.run()"
      />

      <div v-else-if="profile.loading.value && !ready" aria-busy="true" class="space-y-6">
        <div class="h-36 animate-pulse rounded-card bg-inset" />
        <div class="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div v-for="n in 6" :key="n" class="h-24 animate-pulse rounded-card bg-inset" />
        </div>
      </div>

      <template v-else-if="profile.data.value && stats">
        <ProfileHeader
          :display-name="profile.data.value.profile.displayName"
          :username="profile.data.value.profile.username"
          :bio="profile.data.value.profile.bio"
          :avatar-url="profile.data.value.profile.avatarUrl"
          :member-since="profile.data.value.profile.memberSince"
          :is-public="account.data.value?.isPublic ?? true"
          :show-visibility="isOwner"
        />

        <div v-if="isOwner" role="tablist" class="mt-8 flex gap-1 border-b border-hairline">
          <button
            v-for="option in (['colecao', 'conta'] as Tab[])"
            :key="option"
            role="tab"
            type="button"
            :aria-selected="tab === option"
            class="-mb-px border-b-2 px-3 pb-3 text-sm transition-colors"
            :class="
              tab === option
                ? 'border-accent font-medium text-ink'
                : 'border-transparent text-ink-muted hover:text-ink-soft'
            "
            @click="tab = option"
          >
            {{ option === 'colecao' ? 'Coleção' : 'Conta' }}
          </button>
        </div>

        <section v-if="tab === 'colecao'" class="mt-8 space-y-8">
          <StatTiles :totals="stats.totals" />

          <div v-if="!stats.totals.items" class="rounded-card border border-hairline bg-card px-6 py-16 text-center">
            <p class="font-display text-xl text-ink">A estante ainda está vazia</p>
            <p class="mt-2 text-[15px] text-ink-muted">
              Os rankings aparecem assim que houver discos na coleção.
            </p>
          </div>

          <div v-else class="grid gap-6 lg:grid-cols-2">
            <RankingCard title="Estilos" description="Quantos discos de cada estilo." :items="stats.byStyle" />
            <RankingCard
              title="Músicos"
              description="Discos creditados a cada artista. Uma coletânea conta para cada um dos seus artistas."
              :items="stats.byArtist"
            />
            <RankingCard
              title="Décadas"
              description="Discos por década de lançamento."
              :items="stats.byDecade"
            />
            <RankingCard title="Gravadoras" description="Discos por gravadora." :items="stats.byLabel" />
            <RankingCard
              title="Estado de conservação"
              description="Da melhor condição para a pior. Raridade ainda não é registrada, então mostramos a conservação."
              :items="stats.byCondition"
              class="lg:col-span-2"
            />
          </div>
        </section>

        <section v-else-if="tab === 'conta' && account.data.value" class="mt-8">
          <AccountForm
            :account="account.data.value"
            @saved="onSaved"
            @avatar-changed="onAvatarChanged"
          />
        </section>
      </template>
    </main>
  </div>
</template>
