<script setup>
import { reactive, ref } from 'vue'
import AppDialog from '@/components/AppDialog.vue'
import FrequencySelect from '@/components/FrequencySelect.vue'
import ScreenHeader from '@/components/ScreenHeader.vue'
import { useViewStack } from '@/composables/useViewStack.js'
import { incomeDraft, incomeFromDraft } from '@/lib/forms.js'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'
import { useToastStore } from '@/stores/toast.js'

const props = defineProps({ incomeId: { type: String, default: null } })

const budget = useBudgetStore()
const preferences = usePreferencesStore()
const toast = useToastStore()
const { back } = useViewStack()

const previous = budget.incomes.find((income) => income.id === props.incomeId) ?? null
const draft = reactive(incomeDraft(previous, { currency: preferences.currency, timezone: preferences.timezone }))
const errors = ref([])
const confirmDelete = ref(false)

function save() {
  const result = incomeFromDraft(draft, { currency: preferences.currency })
  errors.value = result.errors
  if (!result.income) return
  budget.saveIncome(result.income)
  toast.show(previous ? 'Income saved' : 'Income added')
  back()
}

function remove() {
  confirmDelete.value = false
  const removed = budget.removeIncome(previous.id)
  if (removed) toast.show(`${removed.income.name} removed`, () => budget.restoreIncome(removed))
  back()
}
</script>

<template>
  <section aria-label="Income">
    <form class="mx-auto grid w-full max-w-[40rem] gap-4" novalidate @submit.prevent="save">
      <ScreenHeader :title="previous ? 'Edit income' : 'Add income'" eyebrow="Income" />

      <div class="card grid gap-4">
        <div>
          <label class="label" for="income-name">Name</label>
          <input id="income-name" v-model="draft.name" class="field" maxlength="80" autocomplete="off" placeholder="Salary">
        </div>
        <div>
          <label class="label" for="income-amount">Amount in {{ preferences.currency }}</label>
          <input id="income-amount" v-model="draft.amountText" class="field tabular-nums" inputmode="decimal" autocomplete="off" placeholder="0.00">
        </div>
        <div>
          <label class="label" for="income-frequency">How often</label>
          <FrequencySelect id="income-frequency" v-model="draft.frequency" />
        </div>
        <div>
          <label class="label" for="income-date">A date it is paid</label>
          <input id="income-date" v-model="draft.anchorDate" class="field" type="date">
        </div>
        <div>
          <label class="label" for="income-notes">Notes</label>
          <textarea id="income-notes" v-model="draft.notes" class="field min-h-24" maxlength="400" />
        </div>
      </div>

      <ul v-if="errors.length" class="card m-0 list-none bg-warn-soft text-warn" role="alert">
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>

      <div class="flex flex-wrap justify-between gap-2">
        <button v-if="previous" type="button" class="btn btn-quiet" @click="confirmDelete = true">Delete</button>
        <span v-else />
        <button type="submit" class="btn">{{ previous ? 'Save income' : 'Add income' }}</button>
      </div>
    </form>

    <AppDialog v-if="previous" v-model:open="confirmDelete" title="Delete this income?">
      <p class="m-0">{{ previous.name }} will be removed from your budget.</p>
      <template #actions>
        <button type="button" class="btn btn-quiet" @click="confirmDelete = false">Keep it</button>
        <button type="button" class="btn btn-danger" @click="remove">Delete</button>
      </template>
    </AppDialog>
  </section>
</template>
