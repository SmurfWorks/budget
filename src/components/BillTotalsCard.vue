<script setup>
import { computed } from 'vue'
import { monthView, VIEW_PERIODS } from '@/lib/budget.js'
import { NO_ACCOUNT } from '@/lib/filters.js'
import { sameFrequency } from '@/lib/frequency.js'
import { totalsByAccount, totalsByTag } from '@/lib/groups.js'
import { formatMoney } from '@/lib/money.js'
import { useViewStack } from '@/composables/useViewStack.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

/** `account` for what goes out of each account, `tag` for what each tag's bills cost. */
const props = defineProps({ by: { type: String, required: true } })

const budget = useBudgetStore()
const preferences = usePreferencesStore()
const { open } = useViewStack()

const money = (minor) => formatMoney(minor, preferences.currency, undefined, { narrow: true })
const period = computed(() => VIEW_PERIODS.find((item) => sameFrequency(item.frequency, budget.view)) ?? monthView())
const titleId = computed(() => `totals-${props.by}`)

const rows = computed(() => {
  if (props.by === 'account') {
    return totalsByAccount(budget.bills, preferences.accounts, budget.view, preferences.currency).map((row) => ({
      key: row.id ?? NO_ACCOUNT,
      label: row.name,
      muted: row.id === null,
      filter: { accountId: row.id ?? NO_ACCOUNT },
      ...row,
    }))
  }
  return totalsByTag(budget.bills, budget.view, preferences.currency).map((row) => ({
    key: row.tag ?? '',
    label: row.tag ? `# ${row.tag}` : 'No tag',
    muted: row.tag === null,
    filter: row.tag ? { tag: row.tag } : null,
    ...row,
  }))
})

const count = (n) => `${n} bill${n === 1 ? '' : 's'}`
</script>

<template>
  <section class="card" :aria-labelledby="titleId">
    <div class="flex items-center justify-between gap-3">
      <h2 :id="titleId" class="m-0 text-lg font-semibold">{{ by === 'account' ? 'Bills by account' : 'Bills by tag' }}</h2>
      <span class="text-sm text-muted">per {{ period.label.toLowerCase() }}</span>
    </div>
    <ul class="m-0 mt-3 grid list-none gap-1 p-0">
      <li v-for="row in rows" :key="row.key">
        <component
          :is="row.filter && row.count > 0 ? 'button' : 'div'"
          :type="row.filter && row.count > 0 ? 'button' : undefined"
          class="flex w-full items-baseline justify-between gap-3 rounded-2xl border-0 bg-transparent px-2 py-2 text-left text-ink"
          @click="row.filter && row.count > 0 && open('bills', row.filter)"
        >
          <span class="min-w-0">
            <span class="block truncate font-semibold" :class="{ 'text-muted': row.muted }">{{ row.label }}</span>
            <span class="block text-sm text-muted">{{ count(row.count) }} · {{ money(row.yearly) }} a year</span>
          </span>
          <span class="font-semibold text-bill tabular-nums">{{ money(row.perPeriod) }}</span>
        </component>
      </li>
    </ul>
    <p v-if="by === 'tag'" class="mt-2 mb-0 text-sm text-muted">A bill with more than one tag counts under each.</p>
  </section>
</template>
