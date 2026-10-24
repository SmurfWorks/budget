import { billInBase } from './budget.js'
import { billOccurrences } from './models.js'
import { formatMoney } from './money.js'
import { addDays, formatDayTime, utcToZoned, zoneAbbreviation, zonedToUtc } from './zoned.js'

export const SYNC_DAYS = 30
export const GRACE_MINUTES = 360
export const KEEP_GOING_KEY = 'keep-going'
const TITLE_MAX = 120
const BODY_MAX = 300
const DAY_MS = 86_400_000

function hourTime(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

/**
 * The reminder slot for a bill that goes out at `billAt`: the last time your reminder hour comes
 * round, in your timezone, before the bill goes out. So the bill goes out within the 24 hours after it.
 * @returns {{ at: number, dateKey: string }}
 */
export function reminderSlot(billAt, userTimeZone, hour) {
  const local = utcToZoned(billAt, userTimeZone).dateKey
  let dateKey = local
  let at = zonedToUtc(dateKey, hourTime(hour), userTimeZone)
  if (at >= billAt) {
    dateKey = addDays(local, -1)
    at = zonedToUtc(dateKey, hourTime(hour), userTimeZone)
  }
  return { at, dateKey }
}

/** The last reminder slot at or before `ms`. */
export function lastSlotBefore(ms, userTimeZone, hour) {
  const dateKey = utcToZoned(ms, userTimeZone).dateKey
  const at = zonedToUtc(dateKey, hourTime(hour), userTimeZone)
  if (at <= ms) return { at, dateKey }
  const earlier = addDays(dateKey, -1)
  return { at: zonedToUtc(earlier, hourTime(hour), userTimeZone), dateKey: earlier }
}

export function slotKey(dateKey) {
  return `slot-${dateKey}`
}

function clip(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

/**
 * Bills that go out in the sync window, each placed in its reminder slot.
 * @param {import('./models.js').Bill[]} bills
 */
export function slottedBills(bills, { userTimeZone, hour, now = Date.now(), days = SYNC_DAYS }) {
  const end = now + days * DAY_MS
  const items = []
  for (const bill of bills) {
    if (!bill.remind) continue
    for (const occurrence of billOccurrences(bill, now, end + DAY_MS * 2)) {
      const slot = reminderSlot(occurrence.at, userTimeZone, hour)
      if (slot.at <= now || slot.at > end) continue
      items.push({ bill, at: occurrence.at, slot })
    }
  }
  return items.sort((a, b) => a.at - b.at)
}

/** The slot keys one bill's reminders fall in. @param {import('./models.js').Bill} bill */
export function slotKeysForBill(bill, options) {
  return new Set(slottedBills([bill], options).map((item) => slotKey(item.slot.dateKey)))
}

function amountText(bill, baseCurrency, locale) {
  const own = formatMoney(bill.amount, bill.currency, locale, { narrow: bill.currency === baseCurrency })
  if (bill.currency === baseCurrency) return own
  return `${own} ≈ ${formatMoney(billInBase(bill, baseCurrency), baseCurrency, locale, { narrow: true })}`
}

function timeText(item, userTimeZone, locale) {
  const yours = formatDayTime(item.at, userTimeZone, locale)
  if (item.bill.timezone === userTimeZone) return yours
  const theirs = formatDayTime(item.at, item.bill.timezone, locale)
  return `${yours} (${theirs} ${zoneAbbreviation(item.bill.timezone, item.at, locale)})`
}

function singleNotification(item, { userTimeZone, baseCurrency, locale, accounts = [] }) {
  const { bill } = item
  const account = accounts.find((entry) => entry.id === bill.accountId)
  const extra = [account && `From ${account.name}`, bill.paymentMethod].filter(Boolean).join(' · ')
  const parts = [amountText(bill, baseCurrency, locale), timeText(item, userTimeZone, locale), extra].filter(Boolean)
  return {
    title: clip(`${bill.name} goes out in the next 24 hours`, TITLE_MAX),
    body: clip(parts.join(' · '), BODY_MAX),
  }
}

/** Lines for several bills, ending in `+2 more` when they do not all fit. */
export function listBody(lines, max = BODY_MAX) {
  const kept = []
  for (let index = 0; index < lines.length; index += 1) {
    const remaining = lines.length - index - 1
    const candidate = [...kept, lines[index]].join('\n')
    const suffix = remaining > 0 ? `\n+${remaining} more` : ''
    if ((candidate + suffix).length > max) {
      const left = lines.length - kept.length
      return clip(`${kept.join('\n')}${kept.length ? '\n' : ''}+${left} more`, max)
    }
    kept.push(lines[index])
  }
  return kept.join('\n')
}

function groupNotification(items, { userTimeZone, baseCurrency, locale }) {
  const total = items.reduce((sum, item) => sum + billInBase(item.bill, baseCurrency), 0)
  const lines = items.map(
    (item) => `${item.bill.name} ${amountText(item.bill, baseCurrency, locale)} · ${formatDayTime(item.at, userTimeZone, locale)}`,
  )
  return {
    title: clip(`${items.length} bills go out in the next 24 hours · ${formatMoney(total, baseCurrency, locale, { narrow: true })}`, TITLE_MAX),
    body: listBody(lines),
  }
}

/**
 * Every notification to book on the reminder server: one per reminder slot that has bills in it,
 * and one at the last slot of the window that asks you to open the app so reminders keep going.
 * @returns {Array<{ key: string, tag: string, deliverAt: string, at: number, title: string, body: string, graceMinutes: number, billIds: string[] }>}
 */
export function plannedReminders(bills, options) {
  const { userTimeZone, hour, now = Date.now(), days = SYNC_DAYS } = options
  const bySlot = new Map()
  for (const item of slottedBills(bills, options)) {
    const list = bySlot.get(item.slot.dateKey) ?? []
    list.push(item)
    bySlot.set(item.slot.dateKey, list)
  }

  const planned = [...bySlot.entries()].map(([dateKey, items]) => {
    const text = items.length === 1 ? singleNotification(items[0], options) : groupNotification(items, options)
    const at = items[0].slot.at
    return {
      key: slotKey(dateKey),
      tag: `bills-${dateKey}`,
      deliverAt: new Date(at).toISOString(),
      at,
      ...text,
      graceMinutes: GRACE_MINUTES,
      billIds: items.map((item) => item.bill.id),
    }
  })

  const last = lastSlotBefore(now + days * DAY_MS, userTimeZone, hour)
  if (last.at > now) {
    planned.push({
      key: KEEP_GOING_KEY,
      tag: KEEP_GOING_KEY,
      deliverAt: new Date(last.at).toISOString(),
      at: last.at,
      title: 'Keep your bill reminders going',
      body: 'Open Budget Helper to book the next 30 days of bill reminders.',
      graceMinutes: GRACE_MINUTES,
      billIds: [],
    })
  }
  return planned.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key))
}

/** `Next reminder: Tue 9:00 AM, for Rent.` or a note that none is due. */
export function describeNextReminder(planned, userTimeZone, bills, locale) {
  const next = planned.find((item) => item.key !== KEEP_GOING_KEY)
  if (!next) return `No bill reminders are due in the next ${SYNC_DAYS} days.`
  const names = next.billIds.map((id) => bills.find((bill) => bill.id === id)?.name).filter(Boolean)
  const what = names.length === 1 ? names[0] : `${names.length} bills`
  return `Next reminder: ${formatDayTime(next.at, userTimeZone, locale)}, for ${what}.`
}
