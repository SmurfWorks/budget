import { describeFrequency, sameFrequency, timesPerYear } from './frequency.js'
import { hasTag } from './groups.js'

/** A key for a frequency, such as `week-2`. @param {import('./frequency.js').Frequency} frequency */
export function frequencyKey(frequency) {
  return `${frequency.unit}-${frequency.every}`
}

/**
 * The frequencies your bills use, most often first, each with how many bills use it.
 * @param {import('./models.js').Bill[]} bills
 */
export function frequencyOptions(bills) {
  const options = []
  for (const bill of bills) {
    const found = options.find((option) => sameFrequency(option.frequency, bill.frequency))
    if (found) found.count += 1
    else options.push({ key: frequencyKey(bill.frequency), frequency: bill.frequency, label: describeFrequency(bill.frequency), count: 1 })
  }
  return options.sort((a, b) => timesPerYear(b.frequency) - timesPerYear(a.frequency))
}

function normalise(text) {
  return text.toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

/** Picks bills with no account, rather than any account. */
export const NO_ACCOUNT = 'none'

/**
 * Bills that match a search, a frequency, an account and a tag. The search looks in the name,
 * tags, account, how it is paid, notes and currency; every word typed must appear somewhere.
 * `accountId` is an account's id, or `NO_ACCOUNT`.
 * @param {import('./models.js').Bill[]} bills
 * @param {{ query?: string, frequencyKey?: string | null, accountId?: string | null, tag?: string | null, accounts?: import('./groups.js').Account[] }} filter
 */
export function filterBills(bills, { query = '', frequencyKey: wanted = null, accountId = null, tag = null, accounts = [] } = {}) {
  const words = normalise(query).split(/\s+/).filter(Boolean)
  const accountName = (bill) => accounts.find((account) => account.id === bill.accountId)?.name ?? ''
  return bills.filter((bill) => {
    if (wanted && frequencyKey(bill.frequency) !== wanted) return false
    if (accountId === NO_ACCOUNT ? accountName(bill) !== '' : accountId && bill.accountId !== accountId) return false
    if (tag && !hasTag(bill, tag)) return false
    if (words.length === 0) return true
    const haystack = normalise([bill.name, ...bill.tags, accountName(bill), bill.paymentMethod, bill.notes, bill.currency].join(' '))
    return words.every((word) => haystack.includes(word))
  })
}
