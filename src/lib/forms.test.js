import { describe, expect, it } from 'vitest'
import { billDraft, billFromDraft, incomeDraft, incomeFromDraft } from './forms.js'

const options = { baseCurrency: 'USD', timezone: 'America/Los_Angeles', now: Date.parse('2026-10-22T19:00:00Z') }

describe('bill and income forms', () => {
  it('starts a new bill as monthly from today in your timezone', () => {
    expect(billDraft(null, options)).toMatchObject({ currency: 'USD', anchorDate: '2026-10-22', dueTime: '09:00', remind: true })
  })

  it('saves a bill in another currency and stamps when its rate was set', () => {
    const draft = { ...billDraft(null, options), name: 'Phone', amountText: '50', currency: 'NZD', rateText: '0.6', timezone: 'Pacific/Auckland' }
    const { bill, errors } = billFromDraft(draft, null, options)
    expect(errors).toEqual([])
    expect(bill).toMatchObject({ name: 'Phone', amount: 5000, currency: 'NZD', rate: 0.6, rateSetAt: '2026-10-22T19:00:00.000Z' })
  })

  it('keeps the old rate date when the rate is unchanged', () => {
    const previous = billFromDraft({ ...billDraft(null, options), name: 'Phone', amountText: '50', currency: 'NZD', rateText: '0.6' }, null, options).bill
    const edited = billFromDraft({ ...billDraft(previous, options), amountText: '55' }, previous, { ...options, now: options.now + 86_400_000 }).bill
    expect(edited.rateSetAt).toBe(previous.rateSetAt)
    expect(edited.amount).toBe(5500)
  })

  it('says what is missing', () => {
    const draft = { ...billDraft(null, options), currency: 'NZD', endDate: '2026-01-01' }
    expect(billFromDraft(draft, null, options).errors).toEqual([
      'Give the bill a name.',
      'Enter the amount, such as 120.50.',
      'Enter how much 1 NZD is in USD, such as 0.6.',
      'The last date must be on or after the first date.',
    ])
  })

  it('saves income in your income currency', () => {
    const draft = { ...incomeDraft(null, { currency: 'USD', ...options }), name: 'Salary', amountText: '10,000' }
    expect(incomeFromDraft(draft, { currency: 'USD' }).income).toMatchObject({ name: 'Salary', amount: 1_000_000 })
    expect(incomeFromDraft({ ...draft, amountText: 'lots' }, { currency: 'USD' }).errors).toEqual(['Enter the amount, such as 5000.'])
  })
})
