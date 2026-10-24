import { describe, expect, it } from 'vitest'
import { addTag, checkAccountName, cleanTag, parseAccounts, parseTags, suggestTags, tagOptions, totalsByAccount, totalsByTag } from './groups.js'

const monthly = { unit: 'month', every: 1 }
const month = monthly

function bill(name, amount, fields = {}) {
  return { id: name, name, amount, currency: 'USD', rate: 1, frequency: monthly, accountId: null, tags: [], ...fields }
}

describe('tags', () => {
  it('tidies what is typed', () => {
    expect(cleanTag('  Home   office ')).toBe('Home office')
    expect(cleanTag(7)).toBe('')
    expect(cleanTag('x'.repeat(50))).toHaveLength(40)
  })

  it('adds a tag once, using the spelling you already use', () => {
    expect(addTag([], 'work', ['Work'])).toEqual(['Work'])
    expect(addTag(['Work'], 'WORK')).toEqual(['Work'])
    expect(addTag(['Work'], '  ')).toEqual(['Work'])
    expect(addTag(['Work'], 'House')).toEqual(['Work', 'House'])
  })

  it('reads stored tags without repeats or blanks', () => {
    expect(parseTags(['Work', 'work', '', 3, ' House '])).toEqual(['Work', 'House'])
    expect(parseTags('Work')).toEqual([])
  })

  it('lists tags in use, most used first, and suggests matches', () => {
    const bills = [bill('Rent', 1, { tags: ['House'] }), bill('Power', 1, { tags: ['house', 'Work'] }), bill('Phone', 1, { tags: ['Work', 'Phone'] })]
    expect(tagOptions(bills)).toEqual([
      { tag: 'House', count: 2 },
      { tag: 'Work', count: 2 },
      { tag: 'Phone', count: 1 },
    ])
    const known = tagOptions(bills).map((option) => option.tag)
    expect(suggestTags(known, 'o', [])).toEqual(['House', 'Work', 'Phone'])
    expect(suggestTags(known, 'ph', [])).toEqual(['Phone'])
    expect(suggestTags(known, '', ['work'])).toEqual(['House', 'Phone'])
  })
})

describe('accounts', () => {
  it('reads stored accounts, dropping ones without an id or name and repeated names', () => {
    expect(parseAccounts([{ id: 'a', name: 'Joint' }, { id: 'b', name: 'joint' }, { id: '', name: 'X' }, { id: 'c', name: ' ' }, null])).toEqual([
      { id: 'a', name: 'Joint' },
    ])
  })

  it('checks names for adding and renaming', () => {
    const accounts = [{ id: 'a', name: 'Joint' }]
    expect(checkAccountName(accounts, '  ').error).toBe('Give the account a name.')
    expect(checkAccountName(accounts, 'joint').error).toBe('You already have Joint.')
    expect(checkAccountName(accounts, 'JOINT', 'a')).toEqual({ name: 'JOINT', error: null })
    expect(checkAccountName(accounts, ' Savings ')).toEqual({ name: 'Savings', error: null })
  })
})

describe('totals', () => {
  const accounts = [{ id: 'joint', name: 'Joint' }, { id: 'card', name: 'Card' }, { id: 'spare', name: 'Spare' }]
  const bills = [
    bill('Rent', 100_000, { accountId: 'joint', tags: ['House'] }),
    bill('Power', 20_000, { accountId: 'joint', tags: ['House', 'Work'] }),
    bill('Phone', 5_000, { currency: 'NZD', rate: 0.6, accountId: 'card', tags: ['Work'] }),
    bill('Gym', 4_000, { accountId: 'gone' }),
  ]

  it('adds up each account per period and per year, with bills that have none last', () => {
    expect(totalsByAccount(bills, accounts, month, 'USD')).toEqual([
      { id: 'joint', name: 'Joint', count: 2, yearly: 1_440_000, perPeriod: 120_000 },
      { id: 'card', name: 'Card', count: 1, yearly: 36_000, perPeriod: 3_000 },
      { id: 'spare', name: 'Spare', count: 0, yearly: 0, perPeriod: 0 },
      { id: null, name: 'No account', count: 1, yearly: 48_000, perPeriod: 4_000 },
    ])
  })

  it('counts a bill under each of its tags, largest first', () => {
    expect(totalsByTag(bills, { unit: 'year', every: 1 }, 'USD')).toEqual([
      { tag: 'House', count: 2, yearly: 1_440_000, perPeriod: 1_440_000 },
      { tag: 'Work', count: 2, yearly: 276_000, perPeriod: 276_000 },
      { tag: null, count: 1, yearly: 48_000, perPeriod: 48_000 },
    ])
  })
})
