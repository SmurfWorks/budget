<script setup>
import { currencyList } from '@/lib/money.js'

const currency = defineModel({ type: String, required: true })
defineProps({ id: { type: String, required: true } })

const names = (() => {
  try {
    return new Intl.DisplayNames(undefined, { type: 'currency' })
  } catch {
    return null
  }
})()

const options = currencyList().map((code) => ({ code, label: names ? `${code} · ${names.of(code)}` : code }))
</script>

<template>
  <select :id="id" v-model="currency" class="field">
    <option v-for="option in options" :key="option.code" :value="option.code">{{ option.label }}</option>
  </select>
</template>
