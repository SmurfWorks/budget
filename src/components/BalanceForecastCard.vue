<script setup>
import { computed, ref } from 'vue'
import BalanceChart from '@/components/BalanceChart.vue'
import { balanceForecast, FORECAST_RANGES, parseBalance } from '@/lib/forecast.js'
import { describeAge } from '@/lib/models.js'
import { amountInputValue, formatMoney } from '@/lib/money.js'
import { formatDateKey } from '@/lib/zoned.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

const budget = useBudgetStore()
const preferences = usePreferencesStore()

const range = ref(FORECAST_RANGES[1])
const editing = ref(false)
const balanceText = ref('')
const balanceError = ref('')

const money = (minor) => formatMoney(minor, preferences.currency, undefined, { narrow: true })
const known = computed(() => preferences.balance !== null && preferences.balanceSetAt !== null)

const forecast = computed(() =>
  balanceForecast({
    incomes: budget.incomes,
    bills: budget.bills,
    balance: preferences.balance,
    balanceSetAt: preferences.balanceSetAt,
    userTimeZone: preferences.timezone,
    baseCurrency: preferences.currency,
    days: range.value.days,
    now: budget.now,
  }),
)

/** Signed amounts for the change from today when no balance is entered: `+$200.00`, `−$80.00`. */
const signed = (minor) => (known.value ? money(minor) : `${minor < 0 ? '−' : '+'}${money(Math.abs(minor))}`)

function startEditing() {
  const amount = preferences.balance ?? 0
  balanceText.value = known.value ? `${amount < 0 ? '-' : ''}${amountInputValue(Math.abs(amount), preferences.currency)}` : ''
  balanceError.value = ''
  editing.value = true
}

function saveBalance() {
  const minor = parseBalance(balanceText.value, preferences.currency)
  if (minor === null) {
    balanceError.value = 'Enter the amount, such as 2500 or -80 if you are overdrawn.'
    return
  }
  preferences.setBalance(minor)
  editing.value = false
}

const listDays = computed(() => forecast.value.points.filter((point) => point.events.length > 0))
</script>

<template>
  <section class="card" aria-labelledby="forecast-title">
    <div class="flex items-center justify-between gap-3">
      <h2 id="forecast-title" class="m-0 text-lg font-semibold">Money in your accounts</h2>
      <span class="text-sm text-muted">estimate</span>
    </div>

    <div v-if="known && !editing" class="mt-2 flex items-end justify-between gap-3">
      <div>
        <p class="m-0 text-sm text-muted">About now</p>
        <p class="m-0 text-[clamp(1.5rem,7vw,2rem)] leading-tight font-semibold tracking-tight tabular-nums" :class="forecast.now < 0 ? 'text-warn' : ''">
          {{ money(forecast.now) }}
        </p>
      </div>
      <button type="button" class="btn btn-quiet min-h-9 px-3 text-sm" @click="startEditing">Update</button>
    </div>
    <p v-if="known && !editing" class="mt-1 mb-0 text-sm text-muted">
      You entered {{ money(preferences.balance) }} {{ describeAge(preferences.balanceSetAt, budget.now) }}. Pay since then is added and bills are taken off.
    </p>

    <p v-if="!known && !editing" class="mt-2 mb-0 text-sm text-muted">
      This shows how far your accounts go up or down from today.
      <button type="button" class="border-0 bg-transparent p-0 font-semibold text-teal" @click="startEditing">Enter what is in them now</button>
      to see amounts.
    </p>

    <form v-if="editing" class="mt-3 grid gap-2" novalidate @submit.prevent="saveBalance">
      <label class="label m-0" for="forecast-balance">In all your accounts now, in {{ preferences.currency }}</label>
      <div class="grid grid-cols-[1fr_auto] gap-2">
        <input id="forecast-balance" v-model="balanceText" class="field tabular-nums" inputmode="decimal" autocomplete="off" placeholder="0.00">
        <button type="submit" class="btn">Save</button>
      </div>
      <p v-if="balanceError" class="m-0 text-sm font-semibold text-warn" role="alert">{{ balanceError }}</p>
      <button type="button" class="justify-self-start border-0 bg-transparent p-0 text-sm font-semibold text-teal" @click="editing = false">Cancel</button>
    </form>

    <div class="segmented mt-4" role="group" aria-label="Show the next">
      <button v-for="item in FORECAST_RANGES" :key="item.id" type="button" :aria-pressed="item.id === range.id" @click="range = item">
        {{ item.label }}
      </button>
    </div>

    <div class="mt-4">
      <BalanceChart :points="forecast.points" :currency="preferences.currency" />
    </div>

    <dl class="mt-3 mb-0 grid gap-1 text-[0.95rem]">
      <div class="flex items-baseline justify-between gap-3">
        <dt>Lowest, {{ formatDateKey(forecast.lowest.dateKey) }}</dt>
        <dd class="m-0 font-semibold tabular-nums" :class="known && forecast.lowest.amount < 0 ? 'text-warn' : ''">{{ signed(forecast.lowest.amount) }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-3">
        <dt>In {{ range.label === 'Year' ? 'a year' : range.label }}</dt>
        <dd class="m-0 font-semibold tabular-nums">{{ signed(forecast.end) }}</dd>
      </div>
    </dl>
    <p v-if="known && forecast.belowZero" class="mt-2 mb-0 rounded-xl bg-warn-soft px-3 py-2 text-sm font-semibold text-warn" role="status">
      Goes below zero on {{ formatDateKey(forecast.belowZero.dateKey, undefined, { weekday: 'long', day: 'numeric', month: 'long' }) }}.
    </p>

    <details class="mt-3">
      <summary class="cursor-pointer text-sm font-semibold text-teal">Show as a list</summary>
      <p v-if="listDays.length === 0" class="mt-2 mb-0 text-sm text-muted">No pay or bills in this time.</p>
      <ul v-else class="m-0 mt-2 grid list-none gap-2 p-0 text-sm">
        <li v-for="point in listDays" :key="point.dateKey" class="border-t border-line pt-2">
          <span class="flex items-baseline justify-between gap-3 font-semibold">
            <span>{{ formatDateKey(point.dateKey) }}</span>
            <span class="tabular-nums" :class="known && point.close < 0 ? 'text-warn' : ''">{{ signed(point.close) }}</span>
          </span>
          <span v-for="(item, index) in point.events" :key="index" class="flex items-baseline justify-between gap-3 text-muted">
            <span class="truncate">{{ item.name }}</span>
            <span class="tabular-nums" :class="item.amount < 0 ? 'text-bill' : 'text-income'">{{ item.amount < 0 ? '−' : '+' }}{{ money(Math.abs(item.amount)) }}</span>
          </span>
        </li>
      </ul>
    </details>
  </section>
</template>
