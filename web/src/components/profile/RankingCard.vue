<script setup lang="ts">
// Ranking de uma dimensão: uma série, uma cor. A lista também serve de tabela para leitor de tela.

import { computed } from 'vue'
import type { Ranked } from '@/types/profile'

const props = defineProps<{
  title: string
  description?: string
  items: Ranked[]
  emptyText?: string
}>()

const max = computed(() => Math.max(1, ...props.items.map((item) => item.count)))

/** Largura relativa ao maior valor, em porcentagem. */
function widthOf(count: number): string {
  return `${(count / max.value) * 100}%`
}
</script>

<template>
  <section class="rounded-card border border-hairline bg-card p-6">
    <h2 class="font-display text-xl text-ink">{{ title }}</h2>
    <p v-if="description" class="mt-1 text-[13px] leading-5 text-ink-muted">{{ description }}</p>

    <p v-if="!items.length" class="mt-6 text-[15px] text-ink-muted">
      {{ emptyText ?? 'Nada por aqui ainda.' }}
    </p>

    <ol v-else class="mt-5 space-y-3">
      <li
        v-for="item in items"
        :key="item.key"
        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5"
      >
        <span class="truncate text-[14px] text-ink">{{ item.label }}</span>
        <span class="text-[14px] font-medium text-ink-soft">{{ item.count }}</span>

        <div class="col-span-2 h-2 w-full rounded-r-[4px] bg-inset" aria-hidden="true">
          <div class="h-2 rounded-r-[4px] bg-accent" :style="{ width: widthOf(item.count) }" />
        </div>
      </li>
    </ol>
  </section>
</template>
