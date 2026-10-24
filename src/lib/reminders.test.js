import { describe, expect, it } from 'vitest'
import { KEEP_GOING_KEY, listBody, plannedReminders, reminderSlot, slotKeysForBill } from './reminders.js'

const LA = 'America/Los_Angeles'
const NZ = 'Pacific/Auckland'

function bill(fields) {
  return {
    id: fields.name.toLowerCase(),
    amount: 10_000,
    currency: 'USD',
    rate: 1,
    rateSetAt: null,
    frequency: { unit: 'month', every: 1 },
    anchorDate: '2026-11-05',
    dueTime: '09:00',
    timezone: LA,
    endDate: null,
    accountId: null,
    tags: [],
    paymentMethod: '',
    notes: '',
    remind: true,
    ...fields,
  }
}

const options = { userTimeZone: LA, hour: 9, baseCurrency: 'USD', locale: 'en-US', now: Date.parse('2026-10-22T19:00:00Z') }

describe('bill reminders', () => {
  it('reminds you at your hour, in your timezone, before a bill that goes out in another timezone', () => {
    // 9 am in New Zealand on 5 November is noon on 4 November in Los Angeles.
    const at = Date.parse('2026-11-04T20:00:00Z')
    expect(new Date(reminderSlot(at, LA, 9).at).toISOString()).toBe('2026-11-04T17:00:00.000Z')
  })

  it('uses the day before when the bill goes out at or before your reminder hour', () => {
    const atNine = Date.parse('2026-11-10T17:00:00Z')
    expect(reminderSlot(atNine, LA, 9).dateKey).toBe('2026-11-09')
    const early = Date.parse('2026-11-10T14:00:00Z')
    expect(reminderSlot(early, LA, 9).dateKey).toBe('2026-11-09')
  })

  it('keeps your reminder hour across a change of clocks', () => {
    // Clocks go back in Los Angeles on 1 November. A bill at 8 am that day is reminded at 9 am daylight time the day before.
    const at = Date.parse('2026-11-01T16:00:00Z')
    expect(new Date(reminderSlot(at, LA, 9).at).toISOString()).toBe('2026-10-31T16:00:00.000Z')
    const after = Date.parse('2026-11-03T20:00:00Z')
    expect(new Date(reminderSlot(after, LA, 9).at).toISOString()).toBe('2026-11-03T17:00:00.000Z')
  })

  it('books one notification per bill slot in the next 30 days, plus a reminder to open the app', () => {
    const accounts = [{ id: 'everyday', name: 'Everyday' }]
    const planned = plannedReminders([bill({ name: 'Power', timezone: NZ, accountId: 'everyday' })], { ...options, accounts })
    expect(planned.map((item) => item.key)).toEqual(['slot-2026-11-04', KEEP_GOING_KEY])
    expect(planned[0]).toMatchObject({
      deliverAt: '2026-11-04T17:00:00.000Z',
      title: 'Power goes out in the next 24 hours',
      graceMinutes: 360,
      billIds: ['power'],
    })
    expect(planned[0].body).toContain('$100.00')
    expect(planned[0].body).toContain('From Everyday')
    expect(planned[0].body).toMatch(/Wed 12:00 PM \(Thu 9:00 AM GMT\+13\)/)
    expect(planned[1].deliverAt).toBe('2026-11-21T17:00:00.000Z')
  })

  it('groups bills that fall in the same slot into one notification', () => {
    const bills = [
      bill({ name: 'Rent', amount: 120_000 }),
      bill({ name: 'Phone', amount: 5_000, currency: 'NZD', rate: 0.6, dueTime: '08:00' }),
    ]
    const planned = plannedReminders(bills, options).filter((item) => item.key !== KEEP_GOING_KEY)
    expect(planned).toHaveLength(1)
    expect(planned[0].key).toBe('slot-2026-11-04')
    expect(planned[0].title).toBe('2 bills go out in the next 24 hours · $1,230.00')
    expect(planned[0].body.split('\n')).toHaveLength(2)
    expect(planned[0].body).toContain('NZ$50.00 ≈ $30.00')
  })

  it('skips bills with reminders off, ended bills, and slots past 30 days', () => {
    const bills = [
      bill({ name: 'Quiet', remind: false }),
      bill({ name: 'Ended', endDate: '2026-10-01', anchorDate: '2026-09-05' }),
      bill({ name: 'Later', anchorDate: '2026-11-25' }),
    ]
    expect(plannedReminders(bills, options).map((item) => item.key)).toEqual([KEEP_GOING_KEY])
  })

  it('cuts a long list short and says how many more there are', () => {
    const lines = Array.from({ length: 12 }, (_, index) => `Bill number ${index} with a long name $100.00 · Wed 9:00 AM`)
    const body = listBody(lines)
    expect(body.length).toBeLessThanOrEqual(300)
    expect(body).toMatch(/\+\d+ more$/)
  })

  it('knows which slots a bill touches, so only those are synced when it changes', () => {
    const keys = slotKeysForBill(bill({ name: 'Weekly', frequency: { unit: 'week', every: 1 }, anchorDate: '2026-10-26' }), options)
    expect([...keys]).toEqual(['slot-2026-10-25', 'slot-2026-11-01', 'slot-2026-11-08', 'slot-2026-11-15'])
  })
})
