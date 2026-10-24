<script setup>
import { computed, ref } from 'vue'
import ScreenHeader from '@/components/ScreenHeader.vue'
import { useViewStack } from '@/composables/useViewStack.js'
import { monthView, VIEW_PERIODS } from '@/lib/budget.js'
import { downloadText } from '@/lib/download.js'
import { sameFrequency } from '@/lib/frequency.js'
import { formatMoney } from '@/lib/money.js'
import { buildReport, reportCsv, reportFileName } from '@/lib/report.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

const props = defineProps({ by: { type: String, default: 'account' } })

const budget = useBudgetStore()
const preferences = usePreferencesStore()
const { open } = useViewStack()

const by = ref(props.by === 'tag' ? 'tag' : 'account')
const money = (minor) => formatMoney(minor, preferences.currency, undefined, { narrow: true })
const period = computed(() => VIEW_PERIODS.find((item) => sameFrequency(item.frequency, budget.view)) ?? monthView())

const report = computed(() =>
  buildReport(budget.bills, { by: by.value, accounts: preferences.accounts, view: budget.view, baseCurrency: preferences.currency }),
)
/** Bars are drawn against the largest group, so the biggest fills the row. */
const largest = computed(() => Math.max(1, ...report.value.groups.map((group) => group.yearly)))
const empty = computed(() =>
  by.value === 'account' ? preferences.accounts.length === 0 : !budget.bills.some((bill) => bill.tags.length > 0),
)

function choosePeriod(item) {
  preferences.viewFrequency = { ...item.frequency }
  preferences.viewChosen = true
}

const count = (n) => `${n} bill${n === 1 ? '' : 's'}`
const percent = (share) => (share > 0 && share < 0.01 ? '<1%' : `${Math.round(share * 100)}%`)

function download() {
  downloadText(reportCsv(report.value, { periodLabel: period.value.label, baseCurrency: preferences.currency }), reportFileName(by.value), 'text/csv')
}
</script>

<template>
  <section aria-label="Report">
    <div class="mx-auto grid w-full max-w-[40rem] gap-4">
      <ScreenHeader title="Report" eyebrow="Bills" />

      <div class="card grid gap-3">
        <div class="segmented" role="group" aria-label="Sum up bills">
          <button type="button" :aria-pressed="by === 'account'" @click="by = 'account'">By account</button>
          <button type="button" :aria-pressed="by === 'tag'" @click="by = 'tag'">By tag</button>
        </div>
        <div class="segmented" role="group" aria-label="Show amounts per">
          <button v-for="item in VIEW_PERIODS" :key="item.id" type="button" :aria-pressed="item.id === period.id" @click="choosePeriod(item)">
            {{ item.label }}
          </button>
        </div>
      </div>

      <p v-if="budget.bills.length === 0" class="card m-0 text-muted">No bills yet. Add some, then come back for the report.</p>
      <p v-else-if="empty && by === 'account'" class="card m-0 text-muted">
        No accounts yet. List the accounts your bills go out of in
        <button type="button" class="border-0 bg-transparent p-0 font-semibold text-teal" @click="open('settings')">Settings</button>,
        then choose one on each bill.
      </p>
      <p v-else-if="empty" class="card m-0 text-muted">No tags yet. Add tags such as Work or House to your bills to sum them up here.</p>

      <template v-else>
        <section class="card" aria-labelledby="report-title">
          <div class="flex items-center justify-between gap-3">
            <h2 id="report-title" class="m-0 text-lg font-semibold">{{ by === 'account' ? 'Bills by account' : 'Bills by tag' }}</h2>
            <span class="text-sm text-muted">per {{ period.label.toLowerCase() }}</span>
          </div>

          <ul class="m-0 mt-3 grid list-none gap-1 p-0">
            <li v-for="group in report.groups" :key="group.key">
              <component
                :is="group.filter && group.count > 0 ? 'button' : 'div'"
                :type="group.filter && group.count > 0 ? 'button' : undefined"
                class="block w-full rounded-2xl border-0 bg-transparent px-2 py-2 text-left text-ink"
                @click="group.filter && group.count > 0 && open('bills', group.filter)"
              >
                <span class="flex items-baseline justify-between gap-3">
                  <span class="min-w-0 truncate font-semibold" :class="{ 'text-muted': group.none }">{{ by === 'tag' && !group.none ? `# ${group.label}` : group.label }}</span>
                  <span class="font-semibold tabular-nums">{{ money(group.perPeriod) }}</span>
                </span>
                <span class="mt-1.5 block h-2 overflow-hidden rounded-full bg-bill-soft" aria-hidden="true">
                  <span class="block h-full rounded-full bg-bill" :style="{ width: `${(group.yearly / largest) * 100}%` }" />
                </span>
                <span class="mt-1 flex items-baseline justify-between gap-3 text-sm text-muted">
                  <span>{{ count(group.count) }} · {{ percent(group.share) }} of bills</span>
                  <span class="tabular-nums">{{ money(group.yearly) }} a year</span>
                </span>
              </component>
            </li>
          </ul>

          <div class="mt-2 flex items-baseline justify-between gap-3 border-t border-line px-2 pt-3">
            <span class="font-semibold">All bills <span class="font-normal text-muted">· {{ count(report.total.count) }}</span></span>
            <span class="text-right">
              <span class="block font-semibold tabular-nums">{{ money(report.total.perPeriod) }}</span>
              <span class="block text-sm text-muted tabular-nums">{{ money(report.total.yearly) }} a year</span>
            </span>
          </div>
          <p v-if="report.overlaps" class="mt-3 mb-0 text-sm text-muted">
            A bill with more than one tag counts under each, so the tags add up to more than all bills.
          </p>
        </section>

        <button type="button" class="btn btn-quiet" @click="download">Download as CSV</button>
      </template>
    </div>
  </section>
</template>
