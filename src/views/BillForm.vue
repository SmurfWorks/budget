<script setup>
import { computed, reactive, ref } from 'vue'
import AppDialog from '@/components/AppDialog.vue'
import CurrencySelect from '@/components/CurrencySelect.vue'
import FrequencySelect from '@/components/FrequencySelect.vue'
import ScreenHeader from '@/components/ScreenHeader.vue'
import TimezoneSelect from '@/components/TimezoneSelect.vue'
import { useViewStack } from '@/composables/useViewStack.js'
import { billDraft, billFromDraft } from '@/lib/forms.js'
import { describeAge } from '@/lib/models.js'
import { formatMoney, parseAmount, parseRate, toBaseMinor } from '@/lib/money.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'
import { useToastStore } from '@/stores/toast.js'

const props = defineProps({ billId: { type: String, default: null } })

const budget = useBudgetStore()
const preferences = usePreferencesStore()
const toast = useToastStore()
const { back } = useViewStack()

const previous = budget.bills.find((bill) => bill.id === props.billId) ?? null
const draft = reactive(billDraft(previous, { baseCurrency: preferences.currency, timezone: preferences.timezone }))
const errors = ref([])
const confirmDelete = ref(false)

const otherCurrency = computed(() => draft.currency !== preferences.currency)
const ratePreview = computed(() => {
  const rate = parseRate(draft.rateText)
  if (!otherCurrency.value || rate === null) return ''
  const line = `1 ${draft.currency} = ${rate} ${preferences.currency}`
  const amount = parseAmount(draft.amountText, draft.currency)
  if (amount === null) return line
  return `${line}, so each time is about ${formatMoney(toBaseMinor(amount, draft.currency, rate, preferences.currency), preferences.currency, undefined, { narrow: true })}`
})

function save() {
  const result = billFromDraft(draft, previous, { baseCurrency: preferences.currency })
  errors.value = result.errors
  if (!result.bill) return
  budget.saveBill(result.bill)
  toast.show(previous ? 'Bill saved' : 'Bill added')
  back()
}

function remove() {
  confirmDelete.value = false
  const removed = budget.removeBill(previous.id)
  if (removed) toast.show(`${removed.bill.name} removed`, () => budget.restoreBill(removed))
  back()
}
</script>

<template>
  <section aria-label="Bill">
    <form class="mx-auto grid w-full max-w-[40rem] gap-4" novalidate @submit.prevent="save">
      <ScreenHeader :title="previous ? 'Edit bill' : 'Add a bill'" eyebrow="Bills" />

      <div class="card grid gap-4">
        <div>
          <label class="label" for="bill-name">Name</label>
          <input id="bill-name" v-model="draft.name" class="field" maxlength="80" autocomplete="off" placeholder="Rent">
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label class="label" for="bill-amount">Amount</label>
            <input id="bill-amount" v-model="draft.amountText" class="field tabular-nums" inputmode="decimal" autocomplete="off" placeholder="0.00">
          </div>
          <div class="w-36">
            <label class="label" for="bill-currency">Currency</label>
            <CurrencySelect id="bill-currency" v-model="draft.currency" />
          </div>
        </div>
        <div v-if="otherCurrency">
          <label class="label" for="bill-rate">Conversion rate: 1 {{ draft.currency }} in {{ preferences.currency }}</label>
          <input id="bill-rate" v-model="draft.rateText" class="field tabular-nums" inputmode="decimal" autocomplete="off" placeholder="0.60">
          <p v-if="ratePreview" class="mt-2 mb-0 text-sm text-muted">{{ ratePreview }}</p>
          <p v-if="previous?.rateSetAt && previous.currency === draft.currency" class="mt-1 mb-0 text-sm text-muted">
            Rate set {{ describeAge(previous.rateSetAt) }}.
          </p>
        </div>
        <div>
          <label class="label" for="bill-frequency">How often</label>
          <FrequencySelect id="bill-frequency" v-model="draft.frequency" />
        </div>
      </div>

      <div class="card grid gap-4">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label" for="bill-date">Goes out on</label>
            <input id="bill-date" v-model="draft.anchorDate" class="field" type="date">
          </div>
          <div>
            <label class="label" for="bill-time">At</label>
            <input id="bill-time" v-model="draft.dueTime" class="field" type="time">
          </div>
        </div>
        <div>
          <label class="label" for="bill-timezone">Its timezone</label>
          <TimezoneSelect id="bill-timezone" v-model="draft.timezone" />
        </div>
        <div>
          <label class="label" for="bill-end">Last date (optional)</label>
          <input id="bill-end" v-model="draft.endDate" class="field" type="date">
        </div>
        <label class="flex items-center gap-3 font-semibold">
          <input v-model="draft.remind" type="checkbox" class="size-5 accent-teal">
          Remind me before it goes out
        </label>
      </div>

      <div class="card grid gap-4">
        <div>
          <label class="label" for="bill-payee">Payee (optional)</label>
          <input id="bill-payee" v-model="draft.payee" class="field" maxlength="80" autocomplete="off">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label" for="bill-reference">Reference</label>
            <input id="bill-reference" v-model="draft.reference" class="field" maxlength="80" autocomplete="off">
          </div>
          <div>
            <label class="label" for="bill-method">Paid by</label>
            <input id="bill-method" v-model="draft.paymentMethod" class="field" maxlength="80" autocomplete="off" placeholder="Direct debit">
          </div>
        </div>
        <div>
          <label class="label" for="bill-notes">Notes</label>
          <textarea id="bill-notes" v-model="draft.notes" class="field min-h-24" maxlength="400" />
        </div>
      </div>

      <ul v-if="errors.length" class="card m-0 list-none bg-warn-soft text-warn" role="alert">
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>

      <div class="flex flex-wrap justify-between gap-2">
        <button v-if="previous" type="button" class="btn btn-quiet" @click="confirmDelete = true">Delete</button>
        <span v-else />
        <button type="submit" class="btn">{{ previous ? 'Save bill' : 'Add bill' }}</button>
      </div>
    </form>

    <AppDialog v-if="previous" v-model:open="confirmDelete" title="Delete this bill?">
      <p class="m-0">{{ previous.name }} and its reminders will be removed.</p>
      <template #actions>
        <button type="button" class="btn btn-quiet" @click="confirmDelete = false">Keep it</button>
        <button type="button" class="btn btn-danger" @click="remove">Delete</button>
      </template>
    </AppDialog>
  </section>
</template>
