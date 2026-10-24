import { billsBetween } from './budget.js'
import { occurrences } from './frequency.js'
import { parseAmount } from './money.js'
import { addDays, todayKey, zonedToUtc } from './zoned.js'

/** How far ahead the forecast can look. */
export const FORECAST_RANGES = [
  { id: 'month', label: '30 days', days: 30 },
  { id: 'quarter', label: '3 months', days: 91 },
  { id: 'half', label: '6 months', days: 182 },
  { id: 'year', label: 'Year', days: 365 },
]

/** Reads a typed balance such as `1,200.50` or `-80` (overdrawn). Returns minor units, or null. */
export function parseBalance(text, currency) {
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  const negative = /^[-−]/.test(trimmed)
  const amount = parseAmount(negative ? trimmed.slice(1) : trimmed, currency)
  if (amount === null) return null
  return negative ? -amount : amount
}

/**
 * Pay and bills after `fromMs` up to the end of `lastKey`, as `{ at, dateKey, kind, name, amount }`
 * with pay positive and bills negative, in your income currency. Pay arrives at the start of its
 * date in your timezone; on a pay date, bills come first, matching **Next pay**.
 */
function events({ incomes, bills, userTimeZone, baseCurrency }, fromMs, lastKey) {
  const endMs = zonedToUtc(addDays(lastKey, 1), '00:00', userTimeZone)
  const pay = incomes.flatMap((income) =>
    occurrences(income.anchorDate, income.frequency, todayKey(userTimeZone, fromMs), lastKey)
      .map((dateKey) => ({ at: zonedToUtc(dateKey, '00:00', userTimeZone), dateKey, kind: 'income', name: income.name, amount: income.amount }))
      .filter((event) => event.at > fromMs),
  )
  const out = billsBetween(bills, fromMs + 1, endMs - 1, userTimeZone, baseCurrency).map((item) => ({
    at: item.at,
    dateKey: item.dateKey,
    kind: 'bill',
    name: item.bill.name,
    amount: -item.base,
  }))
  return [...out, ...pay].sort((a, b) => a.dateKey.localeCompare(b.dateKey) || (a.kind === b.kind ? a.at - b.at : a.kind === 'bill' ? -1 : 1))
}

/**
 * An estimate of the money in all your accounts together, each day from today for `days` days.
 *
 * It starts from the balance you entered (`balance`, at `balanceSetAt`), which already includes
 * anything paid or taken before then, adds the pay and takes off the bills since, and carries on.
 * Without a balance it starts from zero today, so it shows how far your accounts go up or down.
 *
 * Each day has `close` (after everything that day) and `low` (after that day's bills, before its
 * pay), and the pay and bills on it. `now` is the estimate at this moment, `lowest` the lowest
 * `low`, and `belowZero` the first day `low` drops under zero.
 */
export function balanceForecast({ incomes, bills, balance, balanceSetAt, userTimeZone, baseCurrency, days, now = Date.now() }) {
  const known = balance !== null && balance !== undefined && Boolean(balanceSetAt)
  const today = todayKey(userTimeZone, now)
  const last = addDays(today, days)
  const setAt = known ? Math.min(Date.parse(balanceSetAt), now) : zonedToUtc(today, '00:00', userTimeZone) - 1
  const all = events({ incomes, bills, userTimeZone, baseCurrency }, setAt, last)
  const startValue = known ? balance : 0
  const sum = (list) => list.reduce((total, event) => total + event.amount, 0)

  let running = startValue + sum(all.filter((event) => event.dateKey < today))
  const points = []
  for (let offset = 0; offset <= days; offset += 1) {
    const dateKey = addDays(today, offset)
    const day = all.filter((event) => event.dateKey === dateKey)
    const low = running + sum(day.filter((event) => event.kind === 'bill'))
    running += sum(day)
    points.push({ dateKey, low: Math.min(low, running), close: running, events: day })
  }

  const lowest = points.reduce((min, point) => (point.low < min.low ? point : min), points[0])
  const belowZero = points.find((point) => point.low < 0) ?? null
  return {
    known,
    now: startValue + sum(all.filter((event) => event.at <= now)),
    end: running,
    points,
    lowest: { dateKey: lowest.dateKey, amount: lowest.low },
    belowZero: belowZero && { dateKey: belowZero.dateKey, amount: belowZero.low },
  }
}
