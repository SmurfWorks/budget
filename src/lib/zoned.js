/**
 * Dates and times in a named timezone, using only Intl.
 * A date key is `YYYY-MM-DD`; a time is `HH:MM` on a 24-hour clock.
 */

const DAY_MS = 86_400_000

/** @type {Map<string, Intl.DateTimeFormat>} */
const formatters = new Map()

function partsFormatter(timeZone) {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

/** The wall clock in `timeZone` at the moment `ms`. */
export function zoneParts(ms, timeZone) {
  const value = {}
  for (const part of partsFormatter(timeZone).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') value[part.type] = Number(part.value)
  }
  // Some engines report midnight as hour 24 on the previous date.
  if (value.hour === 24) value.hour = 0
  return value
}

/** Minutes ahead of GMT for `timeZone` at the moment `ms`. New Zealand daylight time is 780. */
export function offsetMinutes(timeZone, ms) {
  const v = zoneParts(ms, timeZone)
  const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second)
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

export function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function isTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/** The local date and time in `timeZone` at the moment `ms`. */
export function utcToZoned(ms, timeZone) {
  const v = zoneParts(ms, timeZone)
  return {
    dateKey: `${v.year}-${pad(v.month)}-${pad(v.day)}`,
    time: `${pad(v.hour)}:${pad(v.minute)}`,
  }
}

/** Today's date key in `timeZone`. */
export function todayKey(timeZone, now = Date.now()) {
  return utcToZoned(now, timeZone).dateKey
}

function wallMs(dateKey, time) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return Date.UTC(year, month - 1, day, hour, minute)
}

/**
 * The moment the clock in `timeZone` reads `time` on `dateKey`.
 * A time repeated when clocks go back is the earlier one. A time skipped when clocks go forward
 * moves forward by the size of the jump, so 2:30 am on a spring-forward night is 3:30 am.
 */
export function zonedToUtc(dateKey, time, timeZone) {
  const wall = wallMs(dateKey, time)
  // The real moment is within a day of the wall clock read as UTC, so these straddle any change of clocks.
  const before = offsetMinutes(timeZone, wall - DAY_MS * 1.5)
  const after = offsetMinutes(timeZone, wall + DAY_MS * 1.5)
  const candidates = [...new Set([before, after])]
    .map((offset) => wall - offset * 60_000)
    .filter((ms) => {
      const local = utcToZoned(ms, timeZone)
      return local.dateKey === dateKey && local.time === time
    })
  if (candidates.length > 0) return Math.min(...candidates)
  return wall - before * 60_000
}

export function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Whole days from `from` to `to`, negative when `to` is earlier. */
export function daysBetween(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS)
}

/** `dateKey` moved by whole months, keeping its day or the last day of a shorter month. */
export function addMonthsClamped(dateKey, months) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const first = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return `${first.getUTCFullYear()}-${pad(first.getUTCMonth() + 1)}-${pad(Math.min(day, lastDay))}`
}

/** A short name for the zone at that moment, such as `NZDT` or `GMT+13`. */
export function zoneAbbreviation(timeZone, ms, locale) {
  const part = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' })
    .formatToParts(new Date(ms))
    .find((item) => item.type === 'timeZoneName')
  return part ? part.value : timeZone
}

/** `Tue 9:00 AM` in `timeZone`. */
export function formatDayTime(ms, timeZone, locale) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms))
}

/** `Tue 4 Nov, 9:00 AM` in `timeZone`. */
export function formatDateTime(ms, timeZone, locale) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms))
}

/** `Tue 4 Nov` for a date key, read as a calendar date. */
export function formatDateKey(dateKey, locale, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(new Date(Date.UTC(year, month - 1, day)))
}
