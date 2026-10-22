<script setup>
import { onMounted, ref, watch } from 'vue'

const open = defineModel('open', { type: Boolean, default: false })
defineProps({ title: { type: String, required: true } })

const dialog = ref(null)

function sync(value) {
  const element = dialog.value
  if (!element) return
  if (value && !element.open) element.showModal()
  if (!value && element.open) element.close()
}

watch(open, sync)
onMounted(() => sync(open.value))
</script>

<template>
  <dialog ref="dialog" :aria-label="title" @close="open = false" @click.self="open = false">
    <div class="p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="m-0 text-[1.45rem] font-semibold tracking-tight">{{ title }}</h2>
        <button type="button" class="icon-btn" aria-label="Close" @click="open = false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div class="mt-3 text-[0.98rem] leading-relaxed">
        <slot />
      </div>
      <div v-if="$slots.actions" class="mt-5 flex flex-wrap justify-end gap-2">
        <slot name="actions" />
      </div>
    </div>
  </dialog>
</template>
