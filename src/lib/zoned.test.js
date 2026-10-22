import { describe, expect, it } from 'vitest'
import { addDays, addMonthsClamped, daysBetween, isDateKey, utcToZoned, zonedToUtc } from './zoned.js'

describe('zoned time', () => {
  it('finds the moment a clock in a timezone reads a time', () => {
    expect(new Date(zonedToUtc('2026-11-05', '09:00', 'Pacific/Auckland')).toISOString()).toBe('2026-11-04T20:00:00.000Z')
    expect(new Date(zonedToUtc('2026-11-04', '09:00', 'America/Los_Angeles')).toISOString()).toBe('2026-11-04T17:00:00.000Z')
    expect(utcToZoned(Date.parse('2026-11-04T20:00:00Z'), 'America/Los_Angeles')).toEqual({ dateKey: '2026-11-04', time: '12:00' })
  })

  it('takes the earlier of a repeated hour and jumps forward over a skipped one', () => {
    expect(new Date(zonedToUtc('2026-11-01', '01:30', 'America/Los_Angeles')).toISOString()).toBe('2026-11-01T08:30:00.000Z')
    expect(new Date(zonedToUtc('2026-03-08', '02:30', 'America/Los_Angeles')).toISOString()).toBe('2026-03-08T10:30:00.000Z')
    expect(new Date(zonedToUtc('2026-09-27', '02:30', 'Pacific/Auckland')).toISOString()).toBe('2026-09-26T14:30:00.000Z')
  })

  it('moves dates by days and by months, keeping the day or the end of a shorter month', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(daysBetween('2026-10-01', '2026-10-15')).toBe(14)
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31')
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('accepts only real calendar dates', () => {
    expect(isDateKey('2026-02-29')).toBe(false)
    expect(isDateKey('2028-02-29')).toBe(true)
    expect(isDateKey('2026-2-3')).toBe(false)
  })
})
