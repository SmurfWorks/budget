import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { checkAccountName } from '@/lib/groups.js'
import { defaultPreferences, newId, parsePreferences } from '@/lib/models.js'
import { browserCurrency } from '@/lib/money.js'
import { KEYS, readJson, writeJson } from '@/lib/storage.js'
import { browserTimeZone, chosenTimezone, supportedTimeZones } from '@/lib/timezone.js'

/** Your income currency, timezone, reminder hour, budget period, accounts and reminder server. */
export const usePreferencesStore = defineStore('preferences', () => {
  const stored = parsePreferences(readJson(KEYS.preferences), browserCurrency())
  const currency = ref(stored.currency)
  const reminderHour = ref(stored.reminderHour)
  const viewFrequency = ref(stored.viewFrequency)
  const viewChosen = ref(stored.viewChosen)
  const notify = ref(stored.notify)
  const pushUrl = ref(stored.pushUrl)
  const pushToken = ref(stored.pushToken)
  const accounts = ref(stored.accounts)
  const balance = ref(stored.balance)
  const balanceSetAt = ref(stored.balanceSetAt)
  const timezone = ref(chosenTimezone(readJson(KEYS.timezone), browserTimeZone(), supportedTimeZones()))

  watch([currency, reminderHour, viewFrequency, viewChosen, notify, pushUrl, pushToken, accounts, balance, balanceSetAt], () => {
    writeJson(KEYS.preferences, {
      currency: currency.value,
      reminderHour: reminderHour.value,
      viewFrequency: viewFrequency.value,
      viewChosen: viewChosen.value,
      notify: notify.value,
      pushUrl: pushUrl.value,
      pushToken: pushToken.value,
      accounts: accounts.value,
      balance: balance.value,
      balanceSetAt: balanceSetAt.value,
    })
  }, { deep: true })

  watch(timezone, (value) => writeJson(KEYS.timezone, value))

  /** Takes the budget settings from a backup. The timezone and reminder server stay as they are. */
  function applyBackup(values) {
    currency.value = values.currency
    reminderHour.value = values.reminderHour
    viewFrequency.value = values.viewFrequency
    viewChosen.value = values.viewChosen
    accounts.value = values.accounts
    balance.value = values.balance
    balanceSetAt.value = values.balanceSetAt
  }

  /** Records what is in all your accounts now. */
  function setBalance(minor, now = Date.now()) {
    balance.value = minor
    balanceSetAt.value = new Date(now).toISOString()
  }

  /** Adds an account and returns null, or returns the problem to show. */
  function addAccount(value) {
    const { name, error } = checkAccountName(accounts.value, value)
    if (error) return error
    accounts.value.push({ id: newId(), name })
    return null
  }

  /** Renames an account and returns null, or returns the problem to show. */
  function renameAccount(id, value) {
    const { name, error } = checkAccountName(accounts.value, value, id)
    if (error) return error
    const account = accounts.value.find((item) => item.id === id)
    if (account) account.name = name
    return null
  }

  /** Removes an account and returns what Undo needs to put it back. */
  function removeAccount(id) {
    const index = accounts.value.findIndex((item) => item.id === id)
    if (index < 0) return null
    const [account] = accounts.value.splice(index, 1)
    return { account, index }
  }

  function restoreAccount({ account, index }) {
    accounts.value.splice(Math.min(index, accounts.value.length), 0, account)
  }

  function reset() {
    const defaults = defaultPreferences(browserCurrency())
    currency.value = defaults.currency
    reminderHour.value = defaults.reminderHour
    viewFrequency.value = defaults.viewFrequency
    viewChosen.value = defaults.viewChosen
    notify.value = defaults.notify
    pushUrl.value = defaults.pushUrl
    pushToken.value = defaults.pushToken
    accounts.value = defaults.accounts
    balance.value = defaults.balance
    balanceSetAt.value = defaults.balanceSetAt
    timezone.value = chosenTimezone(null, browserTimeZone(), supportedTimeZones())
  }

  return {
    currency,
    reminderHour,
    viewFrequency,
    viewChosen,
    notify,
    pushUrl,
    pushToken,
    accounts,
    balance,
    balanceSetAt,
    timezone,
    applyBackup,
    setBalance,
    addAccount,
    renameAccount,
    removeAccount,
    restoreAccount,
    reset,
  }
})
