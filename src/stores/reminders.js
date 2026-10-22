import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  checkPushConnection,
  clearNotifications,
  deletePushDevice,
  ensurePushDevice,
  forgetPushDevice,
  pushAuth,
  pushUrlIsReachable,
  readDevice,
  replaceNotifications,
  storedPushDeviceId,
  syncNotificationKeys,
} from '@/lib/push.js'
import { describeNextReminder, KEEP_GOING_KEY, plannedReminders, slotKeysForBill } from '@/lib/reminders.js'
import { useBudgetStore } from './budget.js'
import { usePreferencesStore } from './preferences.js'

/**
 * Books bill reminders on your reminder server. Every sync runs one after another, so a quick run
 * of changes cannot book the same notification twice.
 */
export const useRemindersStore = defineStore('reminders', () => {
  const preferences = usePreferencesStore()
  /** @type {import('vue').Ref<'off' | 'waiting' | 'syncing' | 'ok' | 'error'>} */
  const status = ref(preferences.notify ? 'waiting' : 'off')
  const message = ref('')
  const nextReminder = ref('')

  let booking = Promise.resolve()

  function queue(task) {
    booking = booking.then(task, task)
    return booking
  }

  function currentAuth() {
    return pushAuth(preferences.pushUrl, preferences.pushToken)
  }

  function planned() {
    const budget = useBudgetStore()
    const appUrl = new URL('./', document.baseURI).href
    const icon = new URL('icons/icon-192.png', document.baseURI).href
    return plannedReminders(budget.bills, {
      userTimeZone: preferences.timezone,
      hour: preferences.reminderHour,
      baseCurrency: preferences.currency,
      now: Date.now(),
    }).map((item) => ({ ...item, url: appUrl, icon }))
  }

  function fail(text) {
    status.value = 'error'
    message.value = text
  }

  /** Checks everything needed to book, and returns the server and this phone's id there. */
  async function ready() {
    if (!preferences.notify) {
      status.value = 'off'
      message.value = ''
      return null
    }
    const auth = currentAuth()
    if (!auth) {
      status.value = 'waiting'
      message.value = 'Enter your reminder server address and token.'
      return null
    }
    if (!pushUrlIsReachable(auth.baseUrl, location.protocol)) {
      fail('This page is https, so the reminder server address must be https too.')
      return null
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      fail('Allow notifications for Budget Helper to get bill reminders.')
      return null
    }
    const connection = await checkPushConnection(auth)
    if (!connection.ok) {
      fail(connection.message)
      return null
    }
    const deviceId = await ensurePushDevice(auth, preferences.timezone)
    if (!deviceId) {
      fail('This browser cannot receive push notifications. On iPhone, add Budget Helper to your Home Screen first.')
      return null
    }
    return { auth, deviceId }
  }

  async function run(book) {
    try {
      const target = await ready()
      if (!target) return
      status.value = 'syncing'
      const items = planned()
      await book(target, items)
      status.value = 'ok'
      message.value = ''
      nextReminder.value = describeNextReminder(items, preferences.timezone, useBudgetStore().bills)
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Bill reminders could not be booked.')
    }
  }

  /** Books the next 30 days of reminders for every bill. */
  function syncAll() {
    return queue(() => run(({ auth, deviceId }, items) => replaceNotifications(auth, deviceId, items)))
  }

  /** Re-books only the reminders a bill falls in, before and after it changed. */
  function syncBill(before, after) {
    return queue(() =>
      run(({ auth, deviceId }, items) => {
        const options = { userTimeZone: preferences.timezone, hour: preferences.reminderHour, now: Date.now() }
        const keys = new Set([KEEP_GOING_KEY])
        for (const bill of [before, after]) {
          if (bill) for (const key of slotKeysForBill(bill, options)) keys.add(key)
        }
        return syncNotificationKeys(auth, deviceId, keys, items)
      }),
    )
  }

  /** Asks for permission (this must follow a tap), then books. */
  async function turnOn() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    preferences.notify = true
    return syncAll()
  }

  /** Stops reminders and removes the ones waiting on the server. */
  function turnOff() {
    preferences.notify = false
    return queue(async () => {
      status.value = 'off'
      message.value = ''
      nextReminder.value = ''
      const auth = currentAuth()
      const deviceId = auth && storedPushDeviceId(auth)
      if (!auth || !deviceId) return
      try {
        await clearNotifications(auth, deviceId)
      } catch {
        // The server will skip them once they are late; nothing else to do offline.
      }
    })
  }

  /**
   * Removes this phone and every reminder from the server, and unsubscribes it from push.
   * Throws when the server could not be reached, so you can choose to carry on.
   */
  function deleteRemote() {
    return queue(async () => {
      const device = readDevice()
      if (device) {
        const auth = { baseUrl: device.baseUrl, token: device.token }
        await clearNotifications(auth, device.id).catch((error) => {
          if (!/no longer registered/.test(error.message)) throw error
        })
        await deletePushDevice(auth, device.id)
      }
      try {
        const registration = await navigator.serviceWorker?.getRegistration()
        const subscription = await registration?.pushManager?.getSubscription()
        await subscription?.unsubscribe()
      } catch {
        // No subscription to remove.
      }
      forgetPushDevice()
    })
  }

  function reset() {
    status.value = 'off'
    message.value = ''
    nextReminder.value = ''
  }

  // A new timezone or reminder hour moves every reminder. The timezone is also sent to the server.
  watch(() => [preferences.timezone, preferences.reminderHour], () => syncAll())

  // A different server: release this phone from the old one, then register with the new one.
  watch(
    () => [preferences.pushUrl, preferences.pushToken],
    ([url, token], [oldUrl, oldToken]) => {
      const previous = pushAuth(oldUrl, oldToken)
      const next = pushAuth(url, token)
      if (previous && (!next || previous.baseUrl !== next.baseUrl || previous.token !== next.token)) {
        const deviceId = storedPushDeviceId(previous)
        if (deviceId) queue(() => deletePushDevice(previous, deviceId).catch(() => forgetPushDevice()))
      }
      syncAll()
    },
  )

  return { status, message, nextReminder, syncAll, syncBill, turnOn, turnOff, deleteRemote, reset }
})
