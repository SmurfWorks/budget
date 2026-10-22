import { describe, expect, it } from 'vitest'
import { describeFrequency, occurrences, parseFrequency, timesPerYear } from './frequency.js'

describe('frequency', () => {
  it('counts how many times a year money comes in or goes out', () => {
    expect(timesPerYear({ unit: 'week', every: 1 })).toBe(52)
    expect(timesPerYear({ unit: 'week', every: 2 })).toBe(26)
    expect(timesPerYear({ unit: 'week', every: 4 })).toBe(13)
    expect(timesPerYear({ unit: 'month', every: 1 })).toBe(12)
    expect(timesPerYear({ unit: 'month', every: 3 })).toBe(4)
    expect(timesPerYear({ unit: 'year', every: 1 })).toBe(1)
  })

  it('names the common choices and describes the rest', () => {
    expect(describeFrequency({ unit: 'week', every: 2 })).toBe('Fortnightly')
    expect(describeFrequency({ unit: 'week', every: 3 })).toBe('Every 3 weeks')
    expect(describeFrequency({ unit: 'year', every: 2 })).toBe('Every 2 years')
  })

  it('rejects a frequency it cannot use', () => {
    expect(parseFrequency({ unit: 'day', every: 1 })).toBeNull()
    expect(parseFrequency({ unit: 'week', every: 0 })).toBeNull()
    expect(parseFrequency({ unit: 'month', every: 1.5 })).toBeNull()
    expect(parseFrequency({ unit: 'month', every: 2 })).toEqual({ unit: 'month', every: 2 })
  })

  it('lists weekly dates from the anchor', () => {
    expect(occurrences('2026-10-02', { unit: 'week', every: 2 }, '2026-10-20', '2026-11-30')).toEqual([
      '2026-10-30',
      '2026-11-13',
      '2026-11-27',
    ])
  })

  it('keeps a monthly date on the 31st, using the last day of shorter months', () => {
    expect(occurrences('2026-01-31', { unit: 'month', every: 1 }, '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })

  it('never lists a date before the anchor or after the end date', () => {
    expect(occurrences('2026-11-15', { unit: 'month', every: 1 }, '2026-10-01', '2027-02-28', '2027-01-15')).toEqual([
      '2026-11-15',
      '2026-12-15',
      '2027-01-15',
    ])
    expect(occurrences('2026-03-10', { unit: 'year', every: 1 }, '2027-01-01', '2028-12-31')).toEqual(['2027-03-10', '2028-03-10'])
  })
})
