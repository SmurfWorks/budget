<script setup>
import { computed, ref } from 'vue'
import ScreenHeader from '@/components/ScreenHeader.vue'
import { useViewStack } from '@/composables/useViewStack.js'
import { billInBase, billYearly } from '@/lib/budget.js'
import { filterBills, frequencyOptions } from '@/lib/filters.js'
import { describeFrequency } from '@/lib/frequency.js'
import { nextBillDue, rateIsStale } from '@/lib/models.js'
import { formatMoney } from '@/lib/money.js'
import { formatDateTime } from '@/lib/zoned.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

const budget = useBudgetStore()
const preferences = usePreferencesStore()
const { open } = useViewStack()

const query = ref('')
const chosenFrequency = ref(null)

const frequencies = computed(() => frequencyOptions(budget.bills))
/** The chosen frequency, or none once no bill uses it any more. */
const activeFrequency = computed(() =>
  frequencies.value.some((option) => option.key === chosenFrequency.value) ? chosenFrequency.value : null,
)
const shown = computed(() => filterBills(budget.bills, { query: query.value, frequencyKey: activeFrequency.value }))
const filtering = computed(() => query.value.trim() !== '' || activeFrequency.value !== null)
const shownYearly = computed(() =>
  formatMoney(
    Math.round(shown.value.reduce((total, bill) => total + billYearly(bill, preferences.currency), 0)),
    preferences.currency,
    undefined,
    { narrow: true },
  ),
)

function clearFilters() {
  query.value = ''
  chosenFrequency.value = null
}

function nextText(bill) {
  const next = nextBillDue(bill)
  return next ? `Next: ${formatDateTime(next.at, preferences.timezone)}` : 'Ended'
}
</script>

<template>
  <section aria-label="Bills">
    <div class="mx-auto w-full max-w-[40rem]">
      <ScreenHeader title="Bills" eyebrow="Going out">
        <button type="button" class="btn" @click="open('bill-edit')">Add</button>
      </ScreenHeader>

      <p v-if="budget.bills.length === 0" class="card m-0 text-muted">
        No bills yet. Add rent, power, subscriptions, anything that goes out regularly.
      </p>

      <template v-else>
        <div class="mb-3 grid gap-3">
          <input
            v-model="query"
            class="field"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            aria-label="Search bills"
            placeholder="Search name, payee, reference…"
          >
          <div class="flex flex-wrap gap-2" role="group" aria-label="Show bills that go out">
            <button
              type="button"
              class="chip"
              :aria-pressed="activeFrequency === null"
              @click="chosenFrequency = null"
            >
              All <span class="opacity-60">{{ budget.bills.length }}</span>
            </button>
            <button
              v-for="option in frequencies"
              :key="option.key"
              type="button"
              class="chip"
              :aria-pressed="activeFrequency === option.key"
              @click="chosenFrequency = activeFrequency === option.key ? null : option.key"
            >
              {{ option.label }} <span class="opacity-60">{{ option.count }}</span>
            </button>
          </div>
          <p class="m-0 flex items-baseline justify-between gap-3 text-sm text-muted" role="status">
            <span>
              {{ filtering ? `${shown.length} of ${budget.bills.length} bills` : `${budget.bills.length} bills` }} ·
              {{ shownYearly }} a year
            </span>
            <button v-if="filtering" type="button" class="border-0 bg-transparent p-0 font-semibold text-teal" @click="clearFilters">
              Clear
            </button>
          </p>
        </div>

        <p v-if="shown.length === 0" class="card m-0 text-muted">No bills match.</p>

      <ul v-else class="m-0 grid list-none gap-3 p-0">
        <li v-for="bill in shown" :key="bill.id">
          <button type="button" class="card block w-full text-left text-ink" @click="open('bill-edit', { billId: bill.id })">
            <span class="flex items-baseline justify-between gap-3">
              <span class="truncate text-lg font-semibold">{{ bill.name }}</span>
              <span class="font-semibold text-bill tabular-nums">{{ formatMoney(bill.amount, bill.currency, undefined, { narrow: bill.currency === preferences.currency }) }}</span>
            </span>
            <span class="mt-1 flex items-baseline justify-between gap-3 text-sm text-muted">
              <span>{{ describeFrequency(bill.frequency) }} · {{ nextText(bill) }}</span>
              <span v-if="bill.currency !== preferences.currency" class="whitespace-nowrap tabular-nums">
                ≈ {{ formatMoney(billInBase(bill, preferences.currency), preferences.currency, undefined, { narrow: true }) }}
              </span>
            </span>
            <span class="mt-1 flex items-baseline justify-between gap-3 text-sm">
              <span class="text-muted">{{ formatMoney(Math.round(billYearly(bill, preferences.currency)), preferences.currency, undefined, { narrow: true }) }} a year</span>
              <span v-if="rateIsStale(bill, preferences.currency)" class="rounded-full bg-warn-soft px-2 py-0.5 font-semibold text-warn">
                Check rate
              </span>
              <span v-else-if="!bill.remind" class="text-muted">No reminder</span>
            </span>
          </button>
        </li>
      </ul>
      </template>
    </div>
  </section>
</template>
