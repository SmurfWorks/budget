<script setup>
import { computed, ref } from 'vue'
import { FREQUENCY_PRESETS, presetFor } from '@/lib/frequency.js'

/** @type {import('vue').ModelRef<import('@/lib/frequency.js').Frequency>} */
const frequency = defineModel({ type: Object, required: true })
defineProps({ id: { type: String, required: true } })

const custom = ref(presetFor(frequency.value) === null)
const choice = computed({
  get: () => (custom.value ? 'custom' : (presetFor(frequency.value)?.id ?? 'custom')),
  set(value) {
    if (value === 'custom') {
      custom.value = true
      return
    }
    custom.value = false
    frequency.value = { ...FREQUENCY_PRESETS.find((preset) => preset.id === value).frequency }
  },
})

function setEvery(event) {
  const every = Math.min(52, Math.max(1, Math.round(Number(event.target.value) || 1)))
  frequency.value = { ...frequency.value, every }
}

function setUnit(event) {
  frequency.value = { ...frequency.value, unit: event.target.value }
}
</script>

<template>
  <div class="grid gap-2">
    <select :id="id" v-model="choice" class="field">
      <option v-for="preset in FREQUENCY_PRESETS" :key="preset.id" :value="preset.id">{{ preset.label }}</option>
      <option value="custom">Every…</option>
    </select>
    <div v-if="custom" class="grid grid-cols-[6rem_1fr] gap-2">
      <input
        class="field"
        type="number"
        inputmode="numeric"
        min="1"
        max="52"
        aria-label="Every how many"
        :value="frequency.every"
        @change="setEvery"
      >
      <select class="field" aria-label="Weeks, months or years" :value="frequency.unit" @change="setUnit">
        <option value="week">weeks</option>
        <option value="month">months</option>
        <option value="year">years</option>
      </select>
    </div>
  </div>
</template>
