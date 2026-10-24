import { timesPerYear } from './frequency.js'
import { totalsByAccount, totalsByTag } from './groups.js'
import { currencyDigits, toBaseMinor } from './money.js'

/**
 * A summary of your bills by account or by tag: each group's total per `view` period and per year,
 * and its share of all your bills. Largest first; **No account** or **No tag** last.
 * By tag, a bill with more than one tag counts under each, so the shares add up to more than 100%.
 * @param {import('./models.js').Bill[]} bills
 * @param {{ by: 'account' | 'tag', accounts: import('./groups.js').Account[], view: import('./frequency.js').Frequency, baseCurrency: string }} options
 */
export function buildReport(bills, { by, accounts, view, baseCurrency }) {
  const allYearly = Math.round(
    bills.reduce((total, bill) => total + toBaseMinor(bill.amount, bill.currency, bill.rate, baseCurrency) * timesPerYear(bill.frequency), 0),
  )
  const rows =
    by === 'account'
      ? totalsByAccount(bills, accounts, view, baseCurrency).map((row) => ({
          key: row.id ?? 'none',
          label: row.name,
          none: row.id === null,
          filter: { accountId: row.id ?? 'none' },
          ...row,
        }))
      : totalsByTag(bills, view, baseCurrency).map((row) => ({
          key: row.tag ?? 'none',
          label: row.tag ?? 'No tag',
          none: row.tag === null,
          filter: row.tag ? { tag: row.tag } : null,
          ...row,
        }))
  const groups = rows
    .map(({ key, label, none, filter, count, yearly, perPeriod }) => ({
      key,
      label,
      none,
      filter,
      count,
      yearly,
      perPeriod,
      share: allYearly > 0 ? yearly / allYearly : 0,
    }))
    .sort((a, b) => Number(a.none) - Number(b.none) || b.yearly - a.yearly || a.label.localeCompare(b.label))
  return {
    by,
    groups,
    total: { count: bills.length, yearly: allYearly, perPeriod: Math.round(allYearly / timesPerYear(view)) },
    overlaps: by === 'tag' && bills.some((bill) => bill.tags.length > 1),
  }
}

function cell(value) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** The summary as CSV, amounts as plain numbers in your income currency. */
export function reportCsv(report, { periodLabel, baseCurrency }) {
  const digits = currencyDigits(baseCurrency)
  const amount = (minor) => (minor / 10 ** digits).toFixed(digits)
  const lines = [
    [report.by === 'account' ? 'Account' : 'Tag', 'Bills', `Per ${periodLabel.toLowerCase()} (${baseCurrency})`, `Per year (${baseCurrency})`, 'Share of bills'],
    ...report.groups.map((group) => [group.label, group.count, amount(group.perPeriod), amount(group.yearly), `${Math.round(group.share * 100)}%`]),
    ['All bills', report.total.count, amount(report.total.perPeriod), amount(report.total.yearly), '100%'],
  ]
  return `${lines.map((line) => line.map(cell).join(',')).join('\n')}\n`
}

/** `budget-report-by-tag-2026-10-24.csv`, dated in local time. */
export function reportFileName(by, now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `budget-report-by-${by}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`
}
