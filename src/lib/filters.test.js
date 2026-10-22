import { describe, expect, it } from 'vitest'
import { filterBills, frequencyOptions } from './filters.js'

const monthly = { unit: 'month', every: 1 }
const fortnightly = { unit: 'week', every: 2 }
const fourWeekly = { unit: 'week', every: 4 }

function bill(name, frequency, fields = {}) {
  return { id: name, name, frequency, payee: '', reference: '', paymentMethod: '', notes: '', currency: 'USD', ...fields }
}

const bills = [
  bill('Rent', monthly, { payee: 'Oak Street Apartments', paymentMethod: 'Direct debit' }),
  bill('Car loan', fortnightly),
  bill('Gym', fourWeekly, { currency: 'GBP' }),
  bill('Power', monthly, { payee: 'PG&E', notes: 'Café heater included' }),
]

describe('filtering bills', () => {
  it('lists the frequencies in use, most often first, with counts', () => {
    expect(frequencyOptions(bills).map((option) => [option.label, option.count])).toEqual([
      ['Fortnightly', 1],
      ['Every 4 weeks', 1],
      ['Monthly', 2],
    ])
  })

  it('keeps four-weekly and monthly bills apart', () => {
    expect(filterBills(bills, { frequencyKey: 'week-4' }).map((item) => item.name)).toEqual(['Gym'])
    expect(filterBills(bills, { frequencyKey: 'month-1' }).map((item) => item.name)).toEqual(['Rent', 'Power'])
  })

  it('searches names, payees, how it is paid, notes and currency, ignoring case and accents', () => {
    expect(filterBills(bills, { query: 'oak' }).map((item) => item.name)).toEqual(['Rent'])
    expect(filterBills(bills, { query: 'direct' }).map((item) => item.name)).toEqual(['Rent'])
    expect(filterBills(bills, { query: 'cafe' }).map((item) => item.name)).toEqual(['Power'])
    expect(filterBills(bills, { query: 'gbp' }).map((item) => item.name)).toEqual(['Gym'])
  })

  it('needs every word, and combines the search with the frequency', () => {
    expect(filterBills(bills, { query: 'car loan' }).map((item) => item.name)).toEqual(['Car loan'])
    expect(filterBills(bills, { query: 'car rent' })).toEqual([])
    expect(filterBills(bills, { query: 'p', frequencyKey: 'month-1' }).map((item) => item.name)).toEqual(['Rent', 'Power'])
    expect(filterBills(bills, { query: '  ' })).toHaveLength(4)
  })
})
