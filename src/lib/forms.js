import { parseFrequency } from './frequency.js'
import { DEFAULT_DUE_TIME, NAME_MAX, NOTES_MAX, newId } from './models.js'
import { amountInputValue, parseAmount, parseRate } from './money.js'
import { isDateKey, isTime, todayKey } from './zoned.js'

/** What the bill form starts with: an existing bill, or a new monthly one from today. */
export function billDraft(bill, { baseCurrency, timezone, now = Date.now() }) {
  if (bill) {
    return {
      id: bill.id,
      name: bill.name,
      amountText: amountInputValue(bill.amount, bill.currency),
      currency: bill.currency,
      rateText: bill.currency === baseCurrency ? '' : String(bill.rate),
      frequency: { ...bill.frequency },
      anchorDate: bill.anchorDate,
      dueTime: bill.dueTime,
      timezone: bill.timezone,
      endDate: bill.endDate ?? '',
      payee: bill.payee,
      reference: bill.reference,
      paymentMethod: bill.paymentMethod,
      notes: bill.notes,
      remind: bill.remind,
    }
  }
  return {
    id: null,
    name: '',
    amountText: '',
    currency: baseCurrency,
    rateText: '',
    frequency: { unit: 'month', every: 1 },
    anchorDate: todayKey(timezone, now),
    dueTime: DEFAULT_DUE_TIME,
    timezone,
    endDate: '',
    payee: '',
    reference: '',
    paymentMethod: '',
    notes: '',
    remind: true,
  }
}

/**
 * Checks the bill form. Returns the bill to save, or the problems to show.
 * A rate that changed (or a new one) is stamped with today, so its age can be shown.
 */
export function billFromDraft(draft, previous, { baseCurrency, now = Date.now() }) {
  const errors = []
  const name = draft.name.trim()
  if (!name) errors.push('Give the bill a name.')
  const amount = parseAmount(draft.amountText, draft.currency)
  if (amount === null) errors.push('Enter the amount, such as 120.50.')
  const sameCurrency = draft.currency === baseCurrency
  const rate = sameCurrency ? 1 : parseRate(draft.rateText)
  if (rate === null) errors.push(`Enter how much 1 ${draft.currency} is in ${baseCurrency}, such as 0.6.`)
  const frequency = parseFrequency(draft.frequency)
  if (!frequency) errors.push('Choose how often it goes out.')
  if (!isDateKey(draft.anchorDate)) errors.push('Choose a date it goes out.')
  if (!isTime(draft.dueTime)) errors.push('Choose the time it goes out.')
  if (draft.endDate && (!isDateKey(draft.endDate) || draft.endDate < draft.anchorDate)) {
    errors.push('The last date must be on or after the first date.')
  }
  if (errors.length > 0) return { bill: null, errors }

  const rateChanged = !previous || previous.currency !== draft.currency || previous.rate !== rate
  return {
    errors,
    bill: {
      id: previous?.id ?? draft.id ?? newId(),
      name: name.slice(0, NAME_MAX),
      amount,
      currency: draft.currency,
      rate,
      rateSetAt: sameCurrency ? null : rateChanged ? new Date(now).toISOString() : previous.rateSetAt,
      frequency,
      anchorDate: draft.anchorDate,
      dueTime: draft.dueTime,
      timezone: draft.timezone,
      endDate: draft.endDate || null,
      payee: draft.payee.trim().slice(0, NAME_MAX),
      reference: draft.reference.trim().slice(0, NAME_MAX),
      paymentMethod: draft.paymentMethod.trim().slice(0, NAME_MAX),
      notes: draft.notes.trim().slice(0, NOTES_MAX),
      remind: draft.remind,
    },
  }
}

export function incomeDraft(income, { currency, timezone, now = Date.now() }) {
  if (income) {
    return {
      id: income.id,
      name: income.name,
      amountText: amountInputValue(income.amount, currency),
      frequency: { ...income.frequency },
      anchorDate: income.anchorDate,
      notes: income.notes,
    }
  }
  return { id: null, name: '', amountText: '', frequency: { unit: 'month', every: 1 }, anchorDate: todayKey(timezone, now), notes: '' }
}

/** Checks the income form. Income is always in your income currency. */
export function incomeFromDraft(draft, { currency }) {
  const errors = []
  const name = draft.name.trim()
  if (!name) errors.push('Give the income a name.')
  const amount = parseAmount(draft.amountText, currency)
  if (amount === null) errors.push('Enter the amount, such as 5000.')
  const frequency = parseFrequency(draft.frequency)
  if (!frequency) errors.push('Choose how often it is paid.')
  if (!isDateKey(draft.anchorDate)) errors.push('Choose a date it is paid.')
  if (errors.length > 0) return { income: null, errors }
  return {
    errors,
    income: {
      id: draft.id ?? newId(),
      name: name.slice(0, NAME_MAX),
      amount,
      frequency,
      anchorDate: draft.anchorDate,
      notes: draft.notes.trim().slice(0, NOTES_MAX),
    },
  }
}
