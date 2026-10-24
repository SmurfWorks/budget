<script setup>
import { computed } from 'vue'
import BalanceForecastCard from '@/components/BalanceForecastCard.vue'
import BillTotalsCard from '@/components/BillTotalsCard.vue'
import BudgetSummaryCard from '@/components/BudgetSummaryCard.vue'
import InstallBanner from '@/components/InstallBanner.vue'
import NextPayCard from '@/components/NextPayCard.vue'
import UpcomingBills from '@/components/UpcomingBills.vue'
import { useAbout } from '@/composables/useAbout.js'
import { useViewStack } from '@/composables/useViewStack.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

const budget = useBudgetStore()
const preferences = usePreferencesStore()
const anyTags = computed(() => budget.bills.some((bill) => bill.tags.length > 0))
const { open } = useViewStack()
const about = useAbout()
</script>

<template>
  <main>
    <div class="mx-auto grid w-full max-w-[40rem] gap-4">
      <header>
        <div class="mb-1.5 flex items-center gap-1.5">
          <p class="eyebrow m-0">Bills and income</p>
          <button type="button" class="grid size-7 place-items-center rounded-full border-0 bg-transparent text-teal" aria-label="How it works" @click="about.open.value = true">
            <svg viewBox="0 0 24 24" class="size-[18px] fill-none stroke-current stroke-2" aria-hidden="true" stroke-linecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.4 9.3a2.6 2.6 0 1 1 3.3 2.5c-.8.3-1.2.9-1.2 1.7V14.2" />
              <circle cx="11.5" cy="17.2" r="0.9" class="fill-current stroke-none" />
            </svg>
          </button>
        </div>
        <div class="flex items-center justify-between gap-3">
          <h1 class="m-0 min-w-0 text-[clamp(2.2rem,6vw,3.3rem)] leading-[0.95] font-semibold tracking-[-0.045em]">Budget Helper</h1>
          <div class="flex flex-none items-center gap-2">
            <button type="button" class="icon-btn text-[0.72rem] font-bold tracking-wide" aria-label="Income" @click="open('incomes')">
              <span aria-hidden="true">INC</span>
            </button>
            <button type="button" class="icon-btn text-[0.72rem] font-bold tracking-wide" aria-label="Bills" @click="open('bills')">
              <span aria-hidden="true">OUT</span>
            </button>
            <button type="button" class="icon-btn" aria-label="Settings" @click="open('settings')">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
            </button>
          </div>
        </div>
      </header>

      <InstallBanner />

      <section v-if="budget.incomes.length === 0 && budget.bills.length === 0" class="card">
        <h2 class="m-0 text-lg font-semibold">Start with your income</h2>
        <p class="mt-2 text-muted">
          Add what comes in and how often, then your regular bills. Your budget appears here.
        </p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" @click="open('income-edit')">Add income</button>
          <button type="button" class="btn btn-quiet" @click="open('bill-edit')">Add a bill</button>
        </div>
      </section>

      <template v-else>
        <BudgetSummaryCard />
        <NextPayCard />
        <BalanceForecastCard />
        <BillTotalsCard v-if="preferences.accounts.length && budget.bills.length" by="account" />
        <BillTotalsCard v-if="anyTags" by="tag" />
        <UpcomingBills />
      </template>
    </div>
  </main>
</template>
