import { addDays, addMonthsClamped, daysBetween, isDateKey } from './zoned.js'

/**
 * How often money comes in or goes out.
 * @typedef {{ unit: 'week' | 'month' | 'year', every: number }} Frequency
 */

export const UNITS = ['week', 'month', 'year']

/** The choices offered first. Anything else is "Every N weeks, months or years". */
export const FREQUENCY_PRESETS = [
  { id: 'weekly', label: 'Weekly', frequency: { unit: 'week', every: 1 } },
  { id: 'fortnightly', label: 'Fortnightly', frequency: { unit: 'week', every: 2 } },
  { id: 'four-weekly', label: 'Every 4 weeks', frequency: { unit: 'week', every: 4 } },
  { id: 'monthly', label: 'Monthly', frequency: { unit: 'month', every: 1 } },
  { id: 'two-monthly', label: 'Every 2 months', frequency: { unit: 'month', every: 2 } },
  { id: 'quarterly', label: 'Quarterly', frequency: { unit: 'month', every: 3 } },
  { id: 'six-monthly', label: 'Every 6 months', frequency: { unit: 'month', every: 6 } },
  { id: 'yearly', label: 'Yearly', frequency: { unit: 'year', every: 1 } },
]

/** @param {unknown} value @returns {Frequency | null} */
export function parseFrequency(value) {
  if (!value || typeof value !== 'object') return null
  const { unit, every } = /** @type {Record<string, unknown>} */ (value)
  if (typeof unit !== 'string' || !UNITS.includes(unit)) return null
  if (typeof every !== 'number' || !Number.isInteger(every) || every < 1 || every > 52) return null
  return { unit: /** @type {Frequency['unit']} */ (unit), every }
}

/** @param {Frequency} a @param {Frequency} b */
export function sameFrequency(a, b) {
  return a.unit === b.unit && a.every === b.every
}

/** @param {Frequency} frequency */
export function presetFor(frequency) {
  return FREQUENCY_PRESETS.find((preset) => sameFrequency(preset.frequency, frequency)) ?? null
}

/** How many times a year it happens: fortnightly is 26, monthly is 12. @param {Frequency} frequency */
export function timesPerYear(frequency) {
  if (frequency.unit === 'week') return 52 / frequency.every
  if (frequency.unit === 'month') return 12 / frequency.every
  return 1 / frequency.every
}

/** @param {Frequency} frequency */
export function describeFrequency(frequency) {
  const preset = presetFor(frequency)
  if (preset) return preset.label
  if (frequency.every === 1) return `Every ${frequency.unit}`
  return `Every ${frequency.every} ${frequency.unit}s`
}

/**
 * The dates it happens on, from `from` to `to` inclusive, never before `anchor` or after `end`.
 * Months and years are counted from the anchor each time, so the 31st falls on the last day of a
 * shorter month and goes back to the 31st after it.
 * @param {string} anchor @param {Frequency} frequency @param {string} from @param {string} to
 * @param {string} [end]
 * @returns {string[]}
 */
export function occurrences(anchor, frequency, from, to, end) {
  if (!isDateKey(anchor) || !isDateKey(from) || !isDateKey(to)) return []
  const last = end && isDateKey(end) && end < to ? end : to
  const dates = []

  if (frequency.unit === 'week') {
    const step = 7 * frequency.every
    const offset = daysBetween(anchor, from)
    let index = Math.max(0, Math.ceil(offset / step))
    for (;;) {
      const date = addDays(anchor, index * step)
      if (date > last) break
      if (date >= from) dates.push(date)
      index += 1
    }
    return dates
  }

  const span = frequency.unit === 'month' ? frequency.every : frequency.every * 12
  const [ay, am] = anchor.split('-').map(Number)
  const [fy, fm] = from.split('-').map(Number)
  let index = Math.max(0, Math.floor(((fy - ay) * 12 + (fm - am)) / span) - 1)
  for (;;) {
    const date = addMonthsClamped(anchor, index * span)
    if (date > last) break
    if (date >= from) dates.push(date)
    index += 1
  }
  return dates
}
