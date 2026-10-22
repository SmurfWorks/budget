<script setup>
import { computed, ref } from 'vue'
import AppDialog from '@/components/AppDialog.vue'
import CurrencySelect from '@/components/CurrencySelect.vue'
import ScreenHeader from '@/components/ScreenHeader.vue'
import TimezoneSelect from '@/components/TimezoneSelect.vue'
import { useViewStack } from '@/composables/useViewStack.js'
import { pageOrigin } from '@/lib/push.js'
import { useDataStore } from '@/stores/data.js'
import { usePreferencesStore } from '@/stores/preferences.js'
import { useRemindersStore } from '@/stores/reminders.js'
import { useToastStore } from '@/stores/toast.js'

const preferences = usePreferencesStore()
const reminders = useRemindersStore()
const data = useDataStore()
const toast = useToastStore()
const { home } = useViewStack()

const origin = pageOrigin(location.href)
const hours = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 1, hour))),
}))

const pushUrl = ref(preferences.pushUrl)
const pushToken = ref(preferences.pushToken)

const restoreInput = ref(null)
const pendingRestore = ref(null)
const restoreOpen = ref(false)
const deleteOpen = ref(false)
const deleteFailed = ref('')
const deleting = ref(false)

const restoreSummary = computed(() => {
  const backup = pendingRestore.value
  if (!backup) return ''
  const when = backup.exportedAt ? ` from ${new Date(backup.exportedAt).toLocaleDateString()}` : ''
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
  return `This backup${when} holds ${count(backup.incomes.length, 'income')} and ${count(backup.bills.length, 'bill')}, in ${backup.preferences.currency}.`
})

function toggleNotify(event) {
  if (event.target.checked) reminders.turnOn()
  else reminders.turnOff()
}

function saveServer() {
  preferences.pushUrl = pushUrl.value.trim()
  preferences.pushToken = pushToken.value.trim()
}

async function chooseRestore(event) {
  const [file] = event.target.files ?? []
  event.target.value = ''
  if (!file) return
  try {
    pendingRestore.value = await data.readBackup(file)
    restoreOpen.value = true
  } catch (error) {
    toast.show(error instanceof Error ? error.message : 'That file could not be read.')
  }
}

function restore() {
  restoreOpen.value = false
  data.restoreBackup(pendingRestore.value)
  pendingRestore.value = null
  toast.show('Backup restored')
}

async function deleteEverything(localOnly = false) {
  deleting.value = true
  try {
    await data.deleteAllData({ localOnly })
    deleteOpen.value = false
    deleteFailed.value = ''
    pushUrl.value = ''
    pushToken.value = ''
    toast.show('All data deleted')
    home()
  } catch (error) {
    deleteFailed.value = error instanceof Error ? error.message : 'The reminder server could not be reached.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section aria-label="Settings">
    <div class="mx-auto grid w-full max-w-[40rem] gap-4">
      <ScreenHeader title="Settings" />

      <div class="card grid gap-4">
        <h2 class="m-0 text-lg font-semibold">Your budget</h2>
        <div>
          <label class="label" for="settings-currency">Income currency</label>
          <CurrencySelect id="settings-currency" v-model="preferences.currency" />
          <p class="mt-2 mb-0 text-sm text-muted">
            Income is in this currency. Bills in other currencies are converted with their own rate.
          </p>
        </div>
        <div>
          <label class="label" for="settings-timezone">Your timezone</label>
          <TimezoneSelect id="settings-timezone" v-model="preferences.timezone" />
        </div>
      </div>

      <div class="card grid gap-4">
        <h2 class="m-0 text-lg font-semibold">Reminders</h2>
        <div>
          <label class="label" for="settings-hour">Reminder hour</label>
          <select id="settings-hour" v-model.number="preferences.reminderHour" class="field">
            <option v-for="hour in hours" :key="hour.value" :value="hour.value">{{ hour.label }}</option>
          </select>
          <p class="mt-2 mb-0 text-sm text-muted">
            Each day at this hour you get one notification for the bills that go out in the next 24 hours.
          </p>
        </div>
        <label class="flex items-center gap-3 font-semibold">
          <input type="checkbox" class="size-5 accent-teal" :checked="preferences.notify" @change="toggleNotify">
          Send reminders
        </label>
        <template v-if="preferences.notify">
          <p class="m-0 text-sm text-muted">
            Register this origin on your reminder server: <strong class="text-ink select-all">{{ origin }}</strong>
          </p>
          <div>
            <label class="label" for="settings-push-url">Reminder server address</label>
            <input id="settings-push-url" v-model="pushUrl" class="field" type="url" inputmode="url" autocomplete="off" placeholder="https://push.example.com" @change="saveServer">
          </div>
          <div>
            <label class="label" for="settings-push-token">Reminder server token</label>
            <input id="settings-push-token" v-model="pushToken" class="field" type="password" autocomplete="off" @change="saveServer">
          </div>
          <p v-if="reminders.message" class="m-0 text-sm" :class="reminders.status === 'error' ? 'text-warn' : 'text-muted'" role="status">
            {{ reminders.message }}
          </p>
          <p v-else-if="reminders.status === 'syncing'" class="m-0 text-sm text-muted" role="status">Booking reminders…</p>
          <p v-else-if="reminders.nextReminder" class="m-0 text-sm text-good" role="status">{{ reminders.nextReminder }}</p>
          <button type="button" class="btn btn-quiet" @click="reminders.syncAll()">Book reminders now</button>
        </template>
      </div>

      <div class="card grid gap-3">
        <h2 class="m-0 text-lg font-semibold">Your data</h2>
        <p class="m-0 text-sm text-muted">
          Your income, bills and settings are kept in this browser only. A backup holds them all, except the timezone and reminder server.
        </p>
        <button type="button" class="btn btn-quiet" @click="data.exportBackup()">Backup to file</button>
        <button type="button" class="btn btn-quiet" @click="restoreInput.click()">Restore from file</button>
        <input ref="restoreInput" type="file" accept="application/json,.json" class="hidden" @change="chooseRestore">
        <button type="button" class="btn btn-danger" @click="deleteOpen = true">Delete all data</button>
      </div>
    </div>

    <AppDialog v-model:open="restoreOpen" title="Restore this backup?">
      <p class="m-0">{{ restoreSummary }} It replaces the income and bills on this phone.</p>
      <template #actions>
        <button type="button" class="btn btn-quiet" @click="restoreOpen = false">Cancel</button>
        <button type="button" class="btn" @click="restore">Restore</button>
      </template>
    </AppDialog>

    <AppDialog v-model:open="deleteOpen" title="Delete all data?">
      <p class="mt-0">
        This removes your income, bills and settings from this phone, and removes this phone and its reminders from your reminder server.
      </p>
      <p v-if="deleteFailed" class="mb-0 font-semibold text-warn" role="alert">
        {{ deleteFailed }} The reminders on the server could not be removed. You can delete the data on this phone anyway.
      </p>
      <template #actions>
        <button type="button" class="btn btn-quiet" @click="deleteOpen = false">Cancel</button>
        <button v-if="deleteFailed" type="button" class="btn btn-danger" :disabled="deleting" @click="deleteEverything(true)">Delete on this phone</button>
        <button v-else type="button" class="btn btn-danger" :disabled="deleting" @click="deleteEverything()">Delete everything</button>
      </template>
    </AppDialog>
  </section>
</template>
