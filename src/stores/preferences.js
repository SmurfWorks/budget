import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { defaultPreferences, parsePreferences } from '@/lib/models.js'
import { browserCurrency } from '@/lib/money.js'
import { KEYS, readJson, writeJson } from '@/lib/storage.js'
import { browserTimeZone, chosenTimezone, supportedTimeZones } from '@/lib/timezone.js'

/** Your income currency, timezone, reminder hour, budget period and reminder server. */
export const usePreferencesStore = defineStore('preferences', () => {
  const stored = parsePreferences(readJson(KEYS.preferences), browserCurrency())
  const currency = ref(stored.currency)
  const reminderHour = ref(stored.reminderHour)
  const viewFrequency = ref(stored.viewFrequency)
  const viewChosen = ref(stored.viewChosen)
  const notify = ref(stored.notify)
  const pushUrl = ref(stored.pushUrl)
  const pushToken = ref(stored.pushToken)
  const timezone = ref(chosenTimezone(readJson(KEYS.timezone), browserTimeZone(), supportedTimeZones()))

  watch([currency, reminderHour, viewFrequency, viewChosen, notify, pushUrl, pushToken], () => {
    writeJson(KEYS.preferences, {
      currency: currency.value,
      reminderHour: reminderHour.value,
      viewFrequency: viewFrequency.value,
      viewChosen: viewChosen.value,
      notify: notify.value,
      pushUrl: pushUrl.value,
      pushToken: pushToken.value,
    })
  }, { deep: true })

  watch(timezone, (value) => writeJson(KEYS.timezone, value))

  /** Takes the budget settings from a backup. The timezone and reminder server stay as they are. */
  function applyBackup(values) {
    currency.value = values.currency
    reminderHour.value = values.reminderHour
    viewFrequency.value = values.viewFrequency
    viewChosen.value = values.viewChosen
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
    timezone.value = chosenTimezone(null, browserTimeZone(), supportedTimeZones())
  }

  return { currency, reminderHour, viewFrequency, viewChosen, notify, pushUrl, pushToken, timezone, applyBackup, reset }
})
