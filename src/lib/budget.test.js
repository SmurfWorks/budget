import { describe, expect, it } from 'vitest'
import { defaultView, summary, untilNextPay } from './budget.js'

const monthly = { unit: 'month', every: 1 }
const fortnightly = { unit: 'week', every: 2 }

function bill(fields) {
  return {
    id: fields.name,
    currency: 'USD',
    rate: 1,
    rateSetAt: null,
    frequency: monthly,
    anchorDate: '2026-10-01',
    dueTime: '09:00',
    timezone: 'UTC',
    endDate: null,
    accountId: null,
    tags: [],
    paymentMethod: '',
    notes: '',
    remind: true,
    ...fields,
  }
}

const salary = { id: 'salary', name: 'Salary', amount: 1_000_000, frequency: monthly, anchorDate: '2026-10-15', notes: '' }

describe('budget', () => {
  it('turns income and bills into yearly figures and shows them per period', () => {
    const result = summary([salary], [bill({ name: 'Rent', amount: 50_000, frequency: fortnightly })], monthly, 'USD')
    expect(result.yearly).toEqual({ income: 12_000_000, bills: 1_300_000, left: 10_700_000 })
    expect(result.perPeriod).toEqual({ income: 1_000_000, bills: 108_333, left: 891_667 })
  })

  it('converts bills in another currency with their rate', () => {
    const bills = [
      bill({ name: 'Rent', amount: 50_000, frequency: fortnightly }),
      bill({ name: 'Phone', amount: 10_000, currency: 'NZD', rate: 0.6 }),
    ]
    expect(summary([salary], bills, monthly, 'USD').yearly.bills).toBe(1_300_000 + 72_000)
  })

  it('shows the budget in the period of your largest income', () => {
    const wages = { ...salary, id: 'wages', amount: 50_000, frequency: fortnightly }
    expect(defaultView([wages, salary])).toEqual(monthly)
    expect(defaultView([wages])).toEqual(fortnightly)
    expect(defaultView([])).toEqual(monthly)
  })

  it('shows a four-weekly budget alongside a monthly one, since 13 four-week periods are not 12 months', () => {
    const fourWeekly = { unit: 'week', every: 4 }
    const pay = { ...salary, id: 'pay', amount: 400_000, frequency: fourWeekly }
    const rent = bill({ name: 'Rent', amount: 100_000 })
    expect(defaultView([pay])).toEqual(fourWeekly)
    expect(summary([pay], [rent], fourWeekly, 'USD').perPeriod).toEqual({ income: 400_000, bills: 92_308, left: 307_692 })
    expect(summary([pay], [rent], monthly, 'USD').perPeriod).toEqual({ income: 433_333, bills: 100_000, left: 333_333 })
  })

  it('lists bills before your next pay, and what that pay leaves after bills until the pay after it', () => {
    const incomes = [
      { ...salary, amount: 100_000 },
      { id: 'wages', name: 'Wages', amount: 50_000, frequency: fortnightly, anchorDate: '2026-10-23', notes: '' },
    ]
    const bills = [bill({ name: 'Groceries', amount: 1_000, frequency: { unit: 'week', every: 1 }, anchorDate: '2026-10-23' })]
    const result = untilNextPay(incomes, bills, 'UTC', 'USD', Date.parse('2026-10-22T12:00:00Z'))
    expect(result.nextPay).toEqual({ dateKey: '2026-10-23', amount: 50_000 })
    expect(result.followingPay.dateKey).toBe('2026-11-06')
    expect(result.billsBefore.map((item) => item.dateKey)).toEqual(['2026-10-23'])
    expect(result.billsBeforeTotal).toBe(1_000)
    expect(result.billsFromPay.map((item) => item.dateKey)).toEqual(['2026-10-30', '2026-11-06'])
    expect(result.leftFromPay).toBe(48_000)
  })

  it('has nothing to show without income', () => {
    expect(untilNextPay([], [], 'UTC', 'USD')).toBeNull()
  })
})
