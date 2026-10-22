<script setup>
import { useViewStack } from '@/composables/useViewStack.js'

defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
})

const { back } = useViewStack()
</script>

<template>
  <header class="mb-5 flex items-center gap-3">
    <button type="button" class="icon-btn" aria-label="Back" @click="back()">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    </button>
    <div class="min-w-0 flex-1">
      <p v-if="eyebrow" class="eyebrow m-0">{{ eyebrow }}</p>
      <h1 class="m-0 truncate text-[1.9rem] leading-tight font-semibold tracking-tight">{{ title }}</h1>
    </div>
    <slot />
  </header>
</template>
