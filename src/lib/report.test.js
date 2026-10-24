import { describe, expect, it } from 'vitest'
import { buildReport, reportCsv, reportFileName } from './report.js'

const monthly = { unit: 'month', every: 1 }
const year = { unit: 'year', every: 1 }

function bill(name, amount, fields = {}) {
  return { id: name, name, amount, currency: 'USD', rate: 1, frequency: monthly, accountId: null, tags: [], ...fields }
}

const accounts = [{ id: 'card', name: 'Card' }, { id: 'joint', name: 'Joint, shared' }]
const bills = [
  bill('Rent', 100_000, { accountId: 'joint', tags: ['House'] }),
  bill('Power', 20_000, { accountId: 'joint', tags: ['House', 'Work'] }),
  bill('Phone', 5_000, { accountId: 'card', tags: ['Work'] }),
  bill('Gym', 5_000),
]

describe('report', () => {
  it('sums each account, largest first, with no account last and shares of all bills', () => {
    const report = buildReport(bills, { by: 'account', accounts, view: monthly, baseCurrency: 'USD' })
    expect(report.groups.map((group) => [group.label, group.count, group.perPeriod, Math.round(group.share * 100)])).toEqual([
      ['Joint, shared', 2, 120_000, 92],
      ['Card', 1, 5_000, 4],
      ['No account', 1, 5_000, 4],
    ])
    expect(report.total).toEqual({ count: 4, yearly: 1_560_000, perPeriod: 130_000 })
    expect(report.overlaps).toBe(false)
  })

  it('counts a bill under each of its tags, and says so', () => {
    const report = buildReport(bills, { by: 'tag', accounts, view: year, baseCurrency: 'USD' })
    expect(report.groups.map((group) => [group.label, group.yearly])).toEqual([
      ['House', 1_440_000],
      ['Work', 300_000],
      ['No tag', 60_000],
    ])
    expect(report.groups[0].filter).toEqual({ tag: 'House' })
    expect(report.groups[2].filter).toBeNull()
    expect(report.overlaps).toBe(true)
  })

  it('writes the summary as CSV, quoting where needed', () => {
    const report = buildReport(bills, { by: 'account', accounts, view: monthly, baseCurrency: 'USD' })
    expect(reportCsv(report, { periodLabel: 'Month', baseCurrency: 'USD' })).toBe(
      'Account,Bills,Per month (USD),Per year (USD),Share of bills\n' +
        '"Joint, shared",2,1200.00,14400.00,92%\n' +
        'Card,1,50.00,600.00,4%\n' +
        'No account,1,50.00,600.00,4%\n' +
        'All bills,4,1300.00,15600.00,100%\n',
    )
    expect(reportFileName('tag', new Date(2026, 9, 24))).toBe('budget-report-by-tag-2026-10-24.csv')
  })
})
