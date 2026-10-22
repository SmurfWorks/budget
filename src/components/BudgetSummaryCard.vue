<script setup>
import { computed } from 'vue'
import { monthView, VIEW_PERIODS } from '@/lib/budget.js'
import { sameFrequency } from '@/lib/frequency.js'
import { formatMoney } from '@/lib/money.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

const budget = useBudgetStore()
const preferences = usePreferencesStore()

const money = (minor) => formatMoney(minor, preferences.currency, undefined, { narrow: true })
const period = computed(() => VIEW_PERIODS.find((item) => sameFrequency(item.frequency, budget.view)) ?? monthView())

function choose(item) {
  preferences.viewFrequency = { ...item.frequency }
  preferences.viewChosen = true
}
</script>

<template>
  <section class="card" aria-labelledby="summary-title">
    <div class="flex items-center justify-between gap-3">
      <h2 id="summary-title" class="m-0 text-lg font-semibold">Your budget</h2>
      <span class="text-sm text-muted">per {{ period.label.toLowerCase() }}</span>
    </div>
    <div class="segmented mt-3" role="group" aria-label="Show the budget per">
      <button
        v-for="item in VIEW_PERIODS"
        :key="item.id"
        type="button"
        :aria-pressed="item.id === period.id"
        @click="choose(item)"
      >
        {{ item.label }}
      </button>
    </div>

    <dl class="mt-4 grid gap-2">
      <div class="flex items-baseline justify-between rounded-2xl bg-income-soft px-4 py-3">
        <dt class="font-semibold text-income">Income</dt>
        <dd class="m-0 text-lg font-semibold tabular-nums">{{ money(budget.budget.perPeriod.income) }}</dd>
      </div>
      <div class="flex items-baseline justify-between rounded-2xl bg-bill-soft px-4 py-3">
        <dt class="font-semibold text-bill">Bills</dt>
        <dd class="m-0 text-lg font-semibold tabular-nums">{{ money(budget.budget.perPeriod.bills) }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-3 px-4 pt-2">
        <dt class="font-semibold whitespace-nowrap">Left to spend</dt>
        <dd
          class="m-0 text-[clamp(1.5rem,7vw,2rem)] leading-none font-semibold tracking-tight tabular-nums"
          :class="budget.budget.perPeriod.left < 0 ? 'text-warn' : 'text-ink'"
        >
          {{ money(budget.budget.perPeriod.left) }}
        </dd>
      </div>
    </dl>
    <p v-if="period.id !== 'year'" class="mt-3 mb-0 text-sm text-muted">
      A year: {{ money(budget.budget.yearly.income) }} in, {{ money(budget.budget.yearly.bills) }} out,
      {{ money(budget.budget.yearly.left) }} left.
    </p>
  </section>
</template>
