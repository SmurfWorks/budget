import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { billsBetween, defaultView, summary, untilNextPay } from '@/lib/budget.js'
import { parseBills, parseIncomes } from '@/lib/models.js'
import { KEYS, readJson, writeJson } from '@/lib/storage.js'
import { usePreferencesStore } from './preferences.js'
import { useRemindersStore } from './reminders.js'

const DAY_MS = 86_400_000

/** Your income and bills, and the budget made from them. */
export const useBudgetStore = defineStore('budget', () => {
  const preferences = usePreferencesStore()
  /** @type {import('vue').Ref<import('@/lib/models.js').Income[]>} */
  const incomes = ref(parseIncomes(readJson(KEYS.incomes, [])))
  /** @type {import('vue').Ref<import('@/lib/models.js').Bill[]>} */
  const bills = ref(parseBills(readJson(KEYS.bills, []), preferences.currency, preferences.timezone))

  watch(incomes, (value) => writeJson(KEYS.incomes, value), { deep: true })
  watch(bills, (value) => writeJson(KEYS.bills, value), { deep: true })

  /** The period the budget is shown in: yours, or the one your largest income is paid in. */
  const view = computed(() => (preferences.viewChosen ? preferences.viewFrequency : defaultView(incomes.value)))

  const budget = computed(() => summary(incomes.value, bills.value, view.value, preferences.currency))

  /** Ticks every minute so "upcoming" and "next pay" move on while the app stays open. */
  const now = ref(Date.now())
  setInterval(() => {
    now.value = Date.now()
  }, 60_000)

  const upcoming = computed(() =>
    billsBetween(bills.value, now.value, now.value + 30 * DAY_MS, preferences.timezone, preferences.currency),
  )

  const nextPay = computed(() =>
    untilNextPay(incomes.value, bills.value, preferences.timezone, preferences.currency, now.value),
  )

  function refreshNow() {
    now.value = Date.now()
  }

  function saveBill(bill) {
    const index = bills.value.findIndex((item) => item.id === bill.id)
    const before = index >= 0 ? bills.value[index] : null
    if (index >= 0) bills.value.splice(index, 1, bill)
    else bills.value.push(bill)
    useRemindersStore().syncBill(before, bill)
  }

  /** Removes a bill and returns what Undo needs to put it back. */
  function removeBill(id) {
    const index = bills.value.findIndex((item) => item.id === id)
    if (index < 0) return null
    const [bill] = bills.value.splice(index, 1)
    useRemindersStore().syncBill(bill, null)
    return { bill, index }
  }

  function restoreBill({ bill, index }) {
    bills.value.splice(Math.min(index, bills.value.length), 0, bill)
    useRemindersStore().syncBill(null, bill)
  }

  /** Takes a removed account off its bills, and returns their ids so Undo can put it back. */
  function clearAccount(accountId) {
    const ids = []
    for (const bill of bills.value) {
      if (bill.accountId !== accountId) continue
      bill.accountId = null
      ids.push(bill.id)
    }
    return ids
  }

  function restoreAccount(accountId, billIds) {
    for (const bill of bills.value) if (billIds.includes(bill.id)) bill.accountId = accountId
  }

  function saveIncome(income) {
    const index = incomes.value.findIndex((item) => item.id === income.id)
    if (index >= 0) incomes.value.splice(index, 1, income)
    else incomes.value.push(income)
  }

  function removeIncome(id) {
    const index = incomes.value.findIndex((item) => item.id === id)
    if (index < 0) return null
    const [income] = incomes.value.splice(index, 1)
    return { income, index }
  }

  function restoreIncome({ income, index }) {
    incomes.value.splice(Math.min(index, incomes.value.length), 0, income)
  }

  function replaceAll(next) {
    incomes.value = next.incomes
    bills.value = next.bills
  }

  function reset() {
    incomes.value = []
    bills.value = []
  }

  return {
    incomes,
    bills,
    view,
    budget,
    now,
    upcoming,
    nextPay,
    refreshNow,
    saveBill,
    removeBill,
    restoreBill,
    clearAccount,
    restoreAccount,
    saveIncome,
    removeIncome,
    restoreIncome,
    replaceAll,
    reset,
  }
})
