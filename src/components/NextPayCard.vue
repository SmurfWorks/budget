<script setup>
import { formatMoney } from '@/lib/money.js'
import { formatDateKey } from '@/lib/zoned.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

const budget = useBudgetStore()
const preferences = usePreferencesStore()

const money = (minor) => formatMoney(minor, preferences.currency, undefined, { narrow: true })
const bills = (count) => (count === 1 ? '1 bill' : `${count} bills`)
</script>

<template>
  <section v-if="budget.nextPay" class="card" aria-labelledby="next-pay-title">
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="next-pay-title" class="m-0 text-lg font-semibold">Next pay</h2>
      <span class="font-semibold text-income tabular-nums">{{ money(budget.nextPay.nextPay.amount) }}</span>
    </div>
    <p class="mt-1 mb-0 text-muted">{{ formatDateKey(budget.nextPay.nextPay.dateKey, undefined, { weekday: 'long', day: 'numeric', month: 'long' }) }}</p>

    <div class="mt-4 grid gap-2 text-[0.95rem]">
      <div class="flex items-baseline justify-between gap-3">
        <span>Before then: {{ bills(budget.nextPay.billsBefore.length) }}</span>
        <span class="font-semibold text-bill tabular-nums">{{ money(budget.nextPay.billsBeforeTotal) }}</span>
      </div>
      <template v-if="budget.nextPay.followingPay">
        <div class="flex items-baseline justify-between gap-3">
          <span>
            From that pay to {{ formatDateKey(budget.nextPay.followingPay.dateKey) }}:
            {{ bills(budget.nextPay.billsFromPay.length) }}
          </span>
          <span class="font-semibold text-bill tabular-nums">{{ money(budget.nextPay.billsFromPayTotal) }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <span class="font-semibold">Left from that pay</span>
          <span class="font-semibold tabular-nums" :class="budget.nextPay.leftFromPay < 0 ? 'text-warn' : ''">
            {{ money(budget.nextPay.leftFromPay) }}
          </span>
        </div>
      </template>
    </div>
  </section>
</template>
