<script setup>
import { useToastStore } from '@/stores/toast.js'

const toast = useToastStore()
</script>

<template>
  <Transition
    enter-from-class="translate-y-4 opacity-0"
    leave-to-class="translate-y-4 opacity-0"
    enter-active-class="transition duration-150"
    leave-active-class="transition duration-150"
  >
    <div
      v-if="toast.message"
      role="status"
      class="fixed inset-x-4 bottom-[max(20px,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-[30rem] items-center justify-between gap-3 rounded-full bg-button px-5 py-3 text-on-button shadow-card"
    >
      <span class="text-[0.95rem] font-semibold">{{ toast.message }}</span>
      <button v-if="toast.undo" type="button" class="border-0 bg-transparent font-bold text-on-button underline" @click="toast.runUndo()">
        Undo
      </button>
    </div>
  </Transition>
</template>
