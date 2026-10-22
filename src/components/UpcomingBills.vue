<script setup>
import { computed, ref } from 'vue'
import { formatMoney } from '@/lib/money.js'
import { formatDateTime } from '@/lib/zoned.js'
import { useViewStack } from '@/composables/useViewStack.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

const SHOWN = 8

const budget = useBudgetStore()
const preferences = usePreferencesStore()
const { open } = useViewStack()
const expanded = ref(false)

const items = computed(() => (expanded.value ? budget.upcoming : budget.upcoming.slice(0, SHOWN)))
const hidden = computed(() => budget.upcoming.length - items.value.length)
</script>

<template>
  <section class="card" aria-labelledby="upcoming-title">
    <h2 id="upcoming-title" class="m-0 text-lg font-semibold">Next 30 days</h2>
    <p v-if="budget.upcoming.length === 0" class="mt-2 mb-0 text-muted">No bills go out in the next 30 days.</p>
    <ul v-else class="m-0 mt-3 grid list-none gap-1 p-0">
      <li v-for="item in items" :key="`${item.bill.id}-${item.billDateKey}`">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-2xl border-0 bg-transparent px-2 py-2 text-left text-ink hover:bg-field-sunk"
          @click="open('bill-edit', { billId: item.bill.id })"
        >
          <span class="min-w-0">
            <span class="block truncate font-semibold">{{ item.bill.name }}</span>
            <span class="block text-sm text-muted">{{ formatDateTime(item.at, preferences.timezone) }}</span>
          </span>
          <span class="text-right tabular-nums">
            <span class="block font-semibold text-bill">{{ formatMoney(item.bill.amount, item.bill.currency, undefined, { narrow: item.bill.currency === preferences.currency }) }}</span>
            <span v-if="item.bill.currency !== preferences.currency" class="block text-sm text-muted">
              ≈ {{ formatMoney(item.base, preferences.currency, undefined, { narrow: true }) }}
            </span>
          </span>
        </button>
      </li>
    </ul>
    <button v-if="hidden > 0" type="button" class="btn btn-quiet mt-3 w-full" @click="expanded = true">
      Show {{ hidden }} more
    </button>
  </section>
</template>
