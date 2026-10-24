<script setup>
import { computed, ref } from 'vue'
import ScreenHeader from '@/components/ScreenHeader.vue'
import { useViewStack } from '@/composables/useViewStack.js'
import { billInBase, billYearly } from '@/lib/budget.js'
import { filterBills, frequencyOptions, NO_ACCOUNT } from '@/lib/filters.js'
import { describeFrequency } from '@/lib/frequency.js'
import { billAccount, hasTag, tagOptions } from '@/lib/groups.js'
import { nextBillDue, rateIsStale } from '@/lib/models.js'
import { formatMoney } from '@/lib/money.js'
import { formatDateTime } from '@/lib/zoned.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'

const props = defineProps({
  /** Opens the list showing one account's bills (`none` for bills with no account). */
  accountId: { type: String, default: null },
  /** Opens the list showing one tag's bills. */
  tag: { type: String, default: null },
})

const budget = useBudgetStore()
const preferences = usePreferencesStore()
const { open } = useViewStack()

const query = ref('')
const chosenFrequency = ref(null)
const chosenAccount = ref(props.accountId)
const chosenTag = ref(props.tag)

const frequencies = computed(() => frequencyOptions(budget.bills))
/** The chosen frequency, or none once no bill uses it any more. */
const activeFrequency = computed(() =>
  frequencies.value.some((option) => option.key === chosenFrequency.value) ? chosenFrequency.value : null,
)
const accounts = computed(() => {
  const options = preferences.accounts.map((account) => ({
    id: account.id,
    label: account.name,
    count: budget.bills.filter((bill) => bill.accountId === account.id).length,
  }))
  const none = budget.bills.filter((bill) => !billAccount(bill, preferences.accounts)).length
  if (options.length > 0 && none > 0) options.push({ id: NO_ACCOUNT, label: 'No account', count: none })
  return options
})
/** The chosen account, or none once it has been removed. */
const activeAccount = computed(() =>
  accounts.value.some((option) => option.id === chosenAccount.value) ? chosenAccount.value : null,
)
const tags = computed(() => tagOptions(budget.bills))
/** The chosen tag, or none once no bill has it any more. */
const activeTag = computed(() =>
  chosenTag.value && budget.bills.some((bill) => hasTag(bill, chosenTag.value))
    ? tags.value.find((option) => hasTag({ tags: [option.tag] }, chosenTag.value)).tag
    : null,
)
const shown = computed(() =>
  filterBills(budget.bills, {
    query: query.value,
    frequencyKey: activeFrequency.value,
    accountId: activeAccount.value,
    tag: activeTag.value,
    accounts: preferences.accounts,
  }),
)
const filtering = computed(
  () => query.value.trim() !== '' || activeFrequency.value !== null || activeAccount.value !== null || activeTag.value !== null,
)
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
  chosenAccount.value = null
  chosenTag.value = null
}

function accountName(bill) {
  return billAccount(bill, preferences.accounts)?.name ?? ''
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
        <button v-if="budget.bills.length" type="button" class="btn btn-quiet" @click="open('report')">Report</button>
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
            placeholder="Search name, tag, account, notes…"
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
          <div v-if="accounts.length" class="flex flex-wrap gap-2" role="group" aria-label="Show bills that go out of">
            <button
              v-for="option in accounts"
              :key="option.id"
              type="button"
              class="chip"
              :aria-pressed="activeAccount === option.id"
              @click="chosenAccount = activeAccount === option.id ? null : option.id"
            >
              {{ option.label }} <span class="opacity-60">{{ option.count }}</span>
            </button>
          </div>
          <div v-if="tags.length" class="flex flex-wrap gap-2" role="group" aria-label="Show bills tagged">
            <button
              v-for="option in tags"
              :key="option.tag"
              type="button"
              class="chip"
              :aria-pressed="activeTag === option.tag"
              @click="chosenTag = activeTag === option.tag ? null : option.tag"
            >
              # {{ option.tag }} <span class="opacity-60">{{ option.count }}</span>
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
            <span v-if="accountName(bill) || bill.tags.length" class="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
              <span v-if="accountName(bill)" class="rounded-full bg-pill px-2 py-0.5 text-ink">{{ accountName(bill) }}</span>
              <span v-for="tag in bill.tags" :key="tag" class="rounded-full bg-teal-soft px-2 py-0.5 text-teal"># {{ tag }}</span>
            </span>
          </button>
        </li>
      </ul>
      </template>
    </div>
  </section>
</template>
