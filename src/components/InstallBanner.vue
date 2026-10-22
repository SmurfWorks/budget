<script setup>
import { useInstall } from '@/composables/useInstall.js'

const { visible, manual, copy, install, dismiss } = useInstall()
</script>

<template>
  <div v-if="visible" class="card flex items-center gap-3 bg-teal-soft">
    <p class="m-0 flex-1 text-[0.95rem]">{{ copy }}</p>
    <button v-if="!manual" type="button" class="btn" @click="install">Install</button>
    <button type="button" class="icon-btn" aria-label="Dismiss" @click="dismiss">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
  </div>
</template>
