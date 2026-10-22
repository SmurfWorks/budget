<script setup>
import ScreenHeader from '@/components/ScreenHeader.vue'
import { useViewStack } from '@/composables/useViewStack.js'
import { incomeYearly } from '@/lib/budget.js'
import { describeFrequency } from '@/lib/frequency.js'
import { nextIncomeDate } from '@/lib/models.js'
import { formatMoney } from '@/lib/money.js'
import { formatDateKey } from '@/lib/zoned.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

const budget = useBudgetStore()
const preferences = usePreferencesStore()
const { open } = useViewStack()

function nextText(income) {
  const next = nextIncomeDate(income, preferences.timezone)
  return next ? `Next: ${formatDateKey(next)}` : ''
}
</script>

<template>
  <section aria-label="Income">
    <div class="mx-auto w-full max-w-[40rem]">
      <ScreenHeader title="Income" eyebrow="Coming in">
        <button type="button" class="btn" @click="open('income-edit')">Add</button>
      </ScreenHeader>

      <p v-if="budget.incomes.length === 0" class="card m-0 text-muted">
        No income yet. Add your pay and how often it comes in.
      </p>

      <ul v-else class="m-0 grid list-none gap-3 p-0">
        <li v-for="income in budget.incomes" :key="income.id">
          <button type="button" class="card block w-full text-left text-ink" @click="open('income-edit', { incomeId: income.id })">
            <span class="flex items-baseline justify-between gap-3">
              <span class="truncate text-lg font-semibold">{{ income.name }}</span>
              <span class="font-semibold text-income tabular-nums">{{ formatMoney(income.amount, preferences.currency, undefined, { narrow: true }) }}</span>
            </span>
            <span class="mt-1 flex items-baseline justify-between gap-3 text-sm text-muted">
              <span>{{ describeFrequency(income.frequency) }} · {{ nextText(income) }}</span>
              <span class="tabular-nums">{{ formatMoney(Math.round(incomeYearly(income)), preferences.currency, undefined, { narrow: true }) }} a year</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
