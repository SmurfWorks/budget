import { describe, expect, it } from 'vitest'
import { balanceForecast, parseBalance } from './forecast.js'

const LA = 'America/Los_Angeles'
const monthly = { unit: 'month', every: 1 }
// 9 am on Tue 3 Nov 2026 in Los Angeles.
const now = Date.parse('2026-11-03T17:00:00Z')

const pay = { id: 'pay', name: 'Pay', amount: 500_000, frequency: monthly, anchorDate: '2026-10-15', notes: '' }

function bill(name, amount, anchorDate, fields = {}) {
  return {
    id: name, name, amount, currency: 'USD', rate: 1, rateSetAt: null, frequency: monthly, anchorDate,
    dueTime: '12:00', timezone: LA, endDate: null, accountId: null, tags: [], paymentMethod: '', notes: '', remind: true,
    ...fields,
  }
}

const base = { incomes: [pay], userTimeZone: LA, baseCurrency: 'USD', days: 30, now }

describe('reading a balance', () => {
  it('takes amounts and overdrawn amounts', () => {
    expect(parseBalance('1,200.50', 'USD')).toBe(120_050)
    expect(parseBalance(' -80 ', 'USD')).toBe(-8_000)
    expect(parseBalance('lots', 'USD')).toBeNull()
    expect(parseBalance('', 'USD')).toBeNull()
  })
})

describe('balance forecast', () => {
  it('starts from zero without a balance, taking bills off and adding pay on their days', () => {
    const forecast = balanceForecast({ ...base, bills: [bill('Rent', 200_000, '2026-10-05')], balance: null, balanceSetAt: null })
    expect(forecast.known).toBe(false)
    expect(forecast.points).toHaveLength(31)
    expect(forecast.points[0]).toMatchObject({ dateKey: '2026-11-03', close: 0 })
    const rentDay = forecast.points.find((point) => point.dateKey === '2026-11-05')
    expect(rentDay).toMatchObject({ low: -200_000, close: -200_000 })
    const payDay = forecast.points.find((point) => point.dateKey === '2026-11-15')
    expect(payDay.close).toBe(300_000)
    expect(forecast.lowest).toEqual({ dateKey: '2026-11-05', amount: -200_000 })
    expect(forecast.belowZero.dateKey).toBe('2026-11-05')
    expect(forecast.end).toBe(300_000)
  })

  it('takes bills on a pay date before the pay, so the low point shows', () => {
    const forecast = balanceForecast({ ...base, bills: [bill('Card', 600_000, '2026-10-15')], balance: 100_000, balanceSetAt: new Date(now).toISOString() })
    const payDay = forecast.points.find((point) => point.dateKey === '2026-11-15')
    expect(payDay).toMatchObject({ low: -500_000, close: 0 })
    expect(payDay.events.map((event) => event.name)).toEqual(['Card', 'Pay'])
  })

  it('brings an older balance up to today with the pay and bills since', () => {
    // Entered on 20 October: Pay on 15 October is already in it; Phone on 25 October and 1 November come off since.
    const forecast = balanceForecast({
      ...base,
      bills: [bill('Phone', 5_000, '2026-10-25'), bill('Power', 10_000, '2026-11-03', { dueTime: '18:00' })],
      balance: 100_000,
      balanceSetAt: '2026-10-20T17:00:00Z',
    })
    expect(forecast.known).toBe(true)
    // Power goes out at 6 pm today: not yet at 9 am, but in today's closing figure.
    expect(forecast.now).toBe(95_000)
    expect(forecast.points[0].close).toBe(85_000)
  })

  it('converts bills in other currencies', () => {
    const forecast = balanceForecast({ ...base, incomes: [], bills: [bill('Gym', 10_000, '2026-11-04', { currency: 'NZD', rate: 0.6 })], balance: 0, balanceSetAt: new Date(now).toISOString() })
    expect(forecast.end).toBe(-6_000)
    expect(forecast.belowZero).toEqual({ dateKey: '2026-11-04', amount: -6_000 })
  })
})
