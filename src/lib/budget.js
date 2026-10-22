import { occurrences, timesPerYear } from './frequency.js'
import { billOccurrences } from './models.js'
import { toBaseMinor } from './money.js'
import { addDays, todayKey, utcToZoned } from './zoned.js'

/** Periods the budget can be shown in. */
export const VIEW_PERIODS = [
  { id: 'week', label: 'Week', frequency: { unit: 'week', every: 1 } },
  { id: 'fortnight', label: 'Fortnight', frequency: { unit: 'week', every: 2 } },
  { id: 'four-weeks', label: '4 weeks', frequency: { unit: 'week', every: 4 } },
  { id: 'month', label: 'Month', frequency: { unit: 'month', every: 1 } },
  { id: 'year', label: 'Year', frequency: { unit: 'year', every: 1 } },
]

/** The month period, shown when nothing else fits. */
export function monthView() {
  return VIEW_PERIODS.find((period) => period.id === 'month')
}

/** A bill's amount in your income currency. @param {import('./models.js').Bill} bill */
export function billInBase(bill, baseCurrency) {
  return toBaseMinor(bill.amount, bill.currency, bill.rate, baseCurrency)
}

/** What a bill costs in a year, in your income currency, unrounded. */
export function billYearly(bill, baseCurrency) {
  return billInBase(bill, baseCurrency) * timesPerYear(bill.frequency)
}

/** What an income brings in a year, unrounded. @param {import('./models.js').Income} income */
export function incomeYearly(income) {
  return income.amount * timesPerYear(income.frequency)
}

/**
 * Income, bills and what is left, for a year and for one `view` period.
 * $10,000 a month and a $500 fortnightly bill are $120,000 and $13,000 a year, which is $10,000
 * and $1,083.33 a month.
 */
export function summary(incomes, bills, view, baseCurrency) {
  const income = incomes.reduce((total, item) => total + incomeYearly(item), 0)
  const outgoing = bills.reduce((total, item) => total + billYearly(item, baseCurrency), 0)
  const periods = timesPerYear(view)
  return {
    yearly: {
      income: Math.round(income),
      bills: Math.round(outgoing),
      left: Math.round(income - outgoing),
    },
    perPeriod: {
      income: Math.round(income / periods),
      bills: Math.round(outgoing / periods),
      left: Math.round((income - outgoing) / periods),
    },
    periods,
  }
}

/** The view period that matches your largest income, or a month. */
export function defaultView(incomes) {
  const largest = [...incomes].sort((a, b) => incomeYearly(b) - incomeYearly(a))[0]
  const match = largest && VIEW_PERIODS.find(
    (period) => period.frequency.unit === largest.frequency.unit && period.frequency.every === largest.frequency.every,
  )
  return (match ?? monthView()).frequency
}

/** Every time a bill goes out in a window, with its date in your timezone and its amount in base. */
export function billsBetween(bills, fromMs, toMs, userTimeZone, baseCurrency) {
  return bills
    .flatMap((bill) =>
      billOccurrences(bill, fromMs, toMs).map((item) => ({
        bill,
        at: item.at,
        billDateKey: item.dateKey,
        dateKey: utcToZoned(item.at, userTimeZone).dateKey,
        base: billInBase(bill, baseCurrency),
      })),
    )
    .sort((a, b) => a.at - b.at)
}

function payDates(incomes, from, to) {
  const byDate = new Map()
  for (const income of incomes) {
    for (const dateKey of occurrences(income.anchorDate, income.frequency, from, to)) {
      byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + income.amount)
    }
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, amount]) => ({ dateKey, amount }))
}

/**
 * Bills before your next pay, and what that pay leaves after the bills that fall before the pay
 * after it. Pay dates are in your timezone and paid on the date; a bill on a pay date counts as
 * before that pay.
 */
export function untilNextPay(incomes, bills, userTimeZone, baseCurrency, now = Date.now()) {
  const today = todayKey(userTimeZone, now)
  const pays = payDates(incomes, addDays(today, 1), addDays(today, 800)).slice(0, 2)
  if (pays.length === 0) return null
  const [nextPay, followingPay] = pays
  const horizon = now + 820 * 86_400_000
  const due = billsBetween(bills, now + 1, horizon, userTimeZone, baseCurrency)

  const before = due.filter((item) => item.dateKey <= nextPay.dateKey)
  const afterPay = followingPay
    ? due.filter((item) => item.dateKey > nextPay.dateKey && item.dateKey <= followingPay.dateKey)
    : []
  const sum = (items) => items.reduce((total, item) => total + item.base, 0)
  return {
    nextPay,
    followingPay: followingPay ?? null,
    billsBefore: before,
    billsBeforeTotal: sum(before),
    billsFromPay: afterPay,
    billsFromPayTotal: sum(afterPay),
    leftFromPay: nextPay.amount - sum(afterPay),
  }
}
