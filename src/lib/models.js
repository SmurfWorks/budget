import { FREQUENCY_PRESETS, occurrences, parseFrequency } from './frequency.js'
import { isCurrency } from './money.js'
import { addDays, isDateKey, isTime, todayKey, zonedToUtc } from './zoned.js'

/**
 * @typedef {import('./frequency.js').Frequency} Frequency
 *
 * @typedef {object} Bill
 * @property {string} id
 * @property {string} name
 * @property {number} amount Minor units of `currency`.
 * @property {string} currency
 * @property {number} rate One unit of `currency` in your income currency. 1 when they match.
 * @property {string | null} rateSetAt When the rate was last changed (ISO).
 * @property {Frequency} frequency
 * @property {string} anchorDate The first date it goes out, `YYYY-MM-DD` in its own timezone.
 * @property {string} dueTime `HH:MM` in its own timezone.
 * @property {string} timezone
 * @property {string | null} endDate The last date it can go out.
 * @property {string} payee
 * @property {string} reference
 * @property {string} paymentMethod
 * @property {string} notes
 * @property {boolean} remind
 *
 * @typedef {object} Income
 * @property {string} id
 * @property {string} name
 * @property {number} amount Minor units of your income currency.
 * @property {Frequency} frequency
 * @property {string} anchorDate A date it is paid, in your timezone.
 * @property {string} notes
 *
 * @typedef {object} Preferences
 * @property {string} currency Your income currency, which everything is shown in.
 * @property {number} reminderHour 0–23, in your timezone.
 * @property {Frequency} viewFrequency
 * @property {boolean} viewChosen Whether you picked the period yourself.
 * @property {boolean} notify
 * @property {string} pushUrl
 * @property {string} pushToken
 */

export const NOTES_MAX = 400
export const NAME_MAX = 80
export const DEFAULT_DUE_TIME = '09:00'
export const RATE_STALE_DAYS = 90

export function newId() {
  return crypto.randomUUID().replaceAll('-', '')
}

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function amount(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

function validTimeZone(value) {
  if (typeof value !== 'string' || value === '') return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** @returns {Bill | null} */
export function parseBill(raw, baseCurrency, fallbackTimeZone) {
  if (!raw || typeof raw !== 'object') return null
  const name = text(raw.name, NAME_MAX)
  const minor = amount(raw.amount)
  const frequency = parseFrequency(raw.frequency)
  if (!name || minor === null || !frequency || !isDateKey(raw.anchorDate)) return null
  const currency = isCurrency(raw.currency) ? raw.currency : baseCurrency
  const rate = currency === baseCurrency ? 1 : typeof raw.rate === 'number' && raw.rate > 0 ? raw.rate : 1
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    name,
    amount: minor,
    currency,
    rate,
    rateSetAt: typeof raw.rateSetAt === 'string' && !Number.isNaN(Date.parse(raw.rateSetAt)) ? raw.rateSetAt : null,
    frequency,
    anchorDate: raw.anchorDate,
    dueTime: isTime(raw.dueTime) ? raw.dueTime : DEFAULT_DUE_TIME,
    timezone: validTimeZone(raw.timezone) ? raw.timezone : fallbackTimeZone,
    endDate: isDateKey(raw.endDate) ? raw.endDate : null,
    payee: text(raw.payee, NAME_MAX),
    reference: text(raw.reference, NAME_MAX),
    paymentMethod: text(raw.paymentMethod, NAME_MAX),
    notes: text(raw.notes, NOTES_MAX),
    remind: raw.remind !== false,
  }
}

/** @returns {Bill[]} */
export function parseBills(raw, baseCurrency, fallbackTimeZone) {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => parseBill(item, baseCurrency, fallbackTimeZone)).filter((bill) => bill !== null)
}

/** @returns {Income | null} */
export function parseIncome(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = text(raw.name, NAME_MAX)
  const minor = amount(raw.amount)
  const frequency = parseFrequency(raw.frequency)
  if (!name || minor === null || !frequency || !isDateKey(raw.anchorDate)) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    name,
    amount: minor,
    frequency,
    anchorDate: raw.anchorDate,
    notes: text(raw.notes, NOTES_MAX),
  }
}

/** @returns {Income[]} */
export function parseIncomes(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(parseIncome).filter((income) => income !== null)
}

/** @returns {Preferences} */
export function defaultPreferences(currency = 'USD') {
  return {
    currency,
    reminderHour: 9,
    viewFrequency: FREQUENCY_PRESETS.find((preset) => preset.id === 'monthly').frequency,
    viewChosen: false,
    notify: false,
    pushUrl: '',
    pushToken: '',
  }
}

/** @returns {Preferences} */
export function parsePreferences(raw, fallbackCurrency = 'USD') {
  const defaults = defaultPreferences(fallbackCurrency)
  if (!raw || typeof raw !== 'object') return defaults
  const hour = raw.reminderHour
  return {
    currency: isCurrency(raw.currency) ? raw.currency : defaults.currency,
    reminderHour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : defaults.reminderHour,
    viewFrequency: parseFrequency(raw.viewFrequency) ?? defaults.viewFrequency,
    viewChosen: raw.viewChosen === true,
    notify: raw.notify === true,
    pushUrl: typeof raw.pushUrl === 'string' ? raw.pushUrl : '',
    pushToken: typeof raw.pushToken === 'string' ? raw.pushToken : '',
  }
}

/** The moment a bill goes out on `dateKey`, a date in its own timezone. @param {Bill} bill */
export function billMoment(bill, dateKey) {
  return zonedToUtc(dateKey, bill.dueTime, bill.timezone)
}

/**
 * Each time a bill goes out between two moments: `[{ dateKey, at }]`, with `at` in ms.
 * @param {Bill} bill
 */
export function billOccurrences(bill, fromMs, toMs) {
  const from = addDays(todayKey(bill.timezone, fromMs), -1)
  const to = addDays(todayKey(bill.timezone, toMs), 1)
  return occurrences(bill.anchorDate, bill.frequency, from, to, bill.endDate ?? undefined)
    .map((dateKey) => ({ dateKey, at: billMoment(bill, dateKey) }))
    .filter((item) => item.at >= fromMs && item.at <= toMs)
}

/** The next time a bill goes out after `now`, or null if it has ended. @param {Bill} bill */
export function nextBillDue(bill, now = Date.now()) {
  return billOccurrences(bill, now + 1, now + 800 * 86_400_000)[0] ?? null
}

/** The next pay date on or after today in your timezone, or null. @param {Income} income */
export function nextIncomeDate(income, timeZone, now = Date.now()) {
  const today = todayKey(timeZone, now)
  return occurrences(income.anchorDate, income.frequency, today, addDays(today, 800))[0] ?? null
}

/** Whether a bill's conversion rate was set long enough ago to check again. @param {Bill} bill */
export function rateIsStale(bill, baseCurrency, now = Date.now()) {
  if (bill.currency === baseCurrency) return false
  if (!bill.rateSetAt) return true
  return now - Date.parse(bill.rateSetAt) > RATE_STALE_DAYS * 86_400_000
}

/** `today`, `3 days ago`, `4 months ago`. */
export function describeAge(iso, now = Date.now()) {
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 45) return `${days} days ago`
  const months = Math.round(days / 30.44)
  if (months < 18) return `${months} months ago`
  return `${Math.round(days / 365.25)} years ago`
}
