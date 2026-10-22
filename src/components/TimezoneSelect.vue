<script setup>
import { supportedTimeZones, timezoneChoices } from '@/lib/timezone.js'

const timezone = defineModel({ type: String, required: true })
defineProps({ id: { type: String, required: true } })

const choices = timezoneChoices(supportedTimeZones(), new Date())
</script>

<template>
  <select :id="id" v-model="timezone" class="field">
    <option v-for="choice in choices" :key="choice.id" :value="choice.id">{{ choice.label }}</option>
  </select>
</template>
