import { describeFrequency, sameFrequency, timesPerYear } from './frequency.js'

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

/**
 * Bills that match a search and a frequency. The search looks in the name, payee, reference,
 * how it is paid, notes and currency; every word typed must appear somewhere.
 * @param {import('./models.js').Bill[]} bills
 * @param {{ query?: string, frequencyKey?: string | null }} filter
 */
export function filterBills(bills, { query = '', frequencyKey: wanted = null } = {}) {
  const words = normalise(query).split(/\s+/).filter(Boolean)
  return bills.filter((bill) => {
    if (wanted && frequencyKey(bill.frequency) !== wanted) return false
    if (words.length === 0) return true
    const haystack = normalise([bill.name, bill.payee, bill.reference, bill.paymentMethod, bill.notes, bill.currency].join(' '))
    return words.every((word) => haystack.includes(word))
  })
}
