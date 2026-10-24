import { describe, expect, it } from 'vitest'
import { filterBills, frequencyOptions, NO_ACCOUNT } from './filters.js'

const monthly = { unit: 'month', every: 1 }
const fortnightly = { unit: 'week', every: 2 }
const fourWeekly = { unit: 'week', every: 4 }

function bill(name, frequency, fields = {}) {
  return { id: name, name, frequency, accountId: null, tags: [], paymentMethod: '', notes: '', currency: 'USD', ...fields }
}

const accounts = [{ id: 'joint', name: 'Joint account' }, { id: 'card', name: 'Credit card' }]

const bills = [
  bill('Rent', monthly, { accountId: 'joint', tags: ['House'], paymentMethod: 'Direct debit' }),
  bill('Car loan', fortnightly, { accountId: 'card' }),
  bill('Gym', fourWeekly, { currency: 'GBP' }),
  bill('Power', monthly, { accountId: 'joint', tags: ['House', 'Work'], notes: 'Café heater included' }),
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

  it('searches names, tags, accounts, how it is paid, notes and currency, ignoring case and accents', () => {
    expect(filterBills(bills, { query: 'work' }).map((item) => item.name)).toEqual(['Power'])
    expect(filterBills(bills, { query: 'credit', accounts }).map((item) => item.name)).toEqual(['Car loan'])
    expect(filterBills(bills, { query: 'direct' }).map((item) => item.name)).toEqual(['Rent'])
    expect(filterBills(bills, { query: 'cafe' }).map((item) => item.name)).toEqual(['Power'])
    expect(filterBills(bills, { query: 'gbp' }).map((item) => item.name)).toEqual(['Gym'])
  })

  it('needs every word, and combines the search with the frequency', () => {
    expect(filterBills(bills, { query: 'car loan' }).map((item) => item.name)).toEqual(['Car loan'])
    expect(filterBills(bills, { query: 'car rent' })).toEqual([])
    expect(filterBills(bills, { query: 'e', frequencyKey: 'month-1' }).map((item) => item.name)).toEqual(['Rent', 'Power'])
    expect(filterBills(bills, { query: '  ' })).toHaveLength(4)
  })

  it('shows one account, or the bills with no account', () => {
    expect(filterBills(bills, { accountId: 'joint', accounts }).map((item) => item.name)).toEqual(['Rent', 'Power'])
    expect(filterBills(bills, { accountId: NO_ACCOUNT, accounts }).map((item) => item.name)).toEqual(['Gym'])
    // A bill whose account was removed has no account.
    expect(filterBills(bills, { accountId: NO_ACCOUNT, accounts: accounts.slice(1) }).map((item) => item.name)).toEqual(['Rent', 'Gym', 'Power'])
  })

  it('shows one tag, ignoring case, combined with the other filters', () => {
    expect(filterBills(bills, { tag: 'house' }).map((item) => item.name)).toEqual(['Rent', 'Power'])
    expect(filterBills(bills, { tag: 'House', query: 'heater' }).map((item) => item.name)).toEqual(['Power'])
  })
})
