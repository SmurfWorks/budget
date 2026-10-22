import { describe, expect, it } from 'vitest'
import { describeAge, nextBillDue, nextIncomeDate, parseBill, parseBills, parsePreferences, rateIsStale } from './models.js'

const raw = {
  id: 'rent',
  name: '  Rent ',
  amount: 120_000,
  currency: 'NZD',
  rate: 0.6,
  rateSetAt: '2026-10-01T00:00:00.000Z',
  frequency: { unit: 'month', every: 1 },
  anchorDate: '2026-10-05',
  dueTime: '07:30',
  timezone: 'Pacific/Auckland',
}

describe('stored bills, income and preferences', () => {
  it('reads a bill and fills in what is missing', () => {
    const bill = parseBill(raw, 'USD', 'America/Los_Angeles')
    expect(bill).toMatchObject({ name: 'Rent', currency: 'NZD', rate: 0.6, dueTime: '07:30', remind: true, endDate: null })
  })

  it('keeps the rate at 1 when the bill is in your income currency', () => {
    expect(parseBill({ ...raw, currency: 'USD' }, 'USD', 'UTC').rate).toBe(1)
  })

  it('drops bills it cannot use and uses your timezone for an unknown one', () => {
    const bills = parseBills([raw, { ...raw, amount: -1 }, { ...raw, anchorDate: 'soon' }, { ...raw, timezone: 'Mars/Base' }], 'USD', 'UTC')
    expect(bills).toHaveLength(2)
    expect(bills[1].timezone).toBe('UTC')
  })

  it('reads preferences, falling back to defaults', () => {
    expect(parsePreferences({ currency: 'NZD', reminderHour: 25 }, 'USD')).toMatchObject({ currency: 'NZD', reminderHour: 9, notify: false })
    expect(parsePreferences(null, 'GBP').currency).toBe('GBP')
  })

  it('finds the next time a bill goes out, and the next pay date', () => {
    const bill = parseBill(raw, 'USD', 'UTC')
    const next = nextBillDue(bill, Date.parse('2026-10-22T00:00:00Z'))
    expect(next.dateKey).toBe('2026-11-05')
    expect(new Date(next.at).toISOString()).toBe('2026-11-04T18:30:00.000Z')
    const income = { id: 'pay', name: 'Pay', amount: 1, frequency: { unit: 'week', every: 2 }, anchorDate: '2026-10-09', notes: '' }
    expect(nextIncomeDate(income, 'UTC', Date.parse('2026-10-22T00:00:00Z'))).toBe('2026-10-23')
  })

  it('flags a conversion rate set more than 90 days ago', () => {
    const bill = parseBill(raw, 'USD', 'UTC')
    expect(rateIsStale(bill, 'USD', Date.parse('2026-11-01T00:00:00Z'))).toBe(false)
    expect(rateIsStale(bill, 'USD', Date.parse('2027-02-01T00:00:00Z'))).toBe(true)
    expect(describeAge('2026-06-01T00:00:00Z', Date.parse('2026-10-01T00:00:00Z'))).toBe('4 months ago')
  })
})
