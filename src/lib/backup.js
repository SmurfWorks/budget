import { parseBills, parseIncomes, parsePreferences } from './models.js'

export const BACKUP_APP = 'budget'
export const BACKUP_VERSION = 1

/**
 * What a backup file holds. The timezone, reminder server and this phone's registration belong to
 * the device, so they are left out.
 */
export function buildBackup({ incomes, bills, preferences }, now = new Date()) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    incomes,
    bills,
    preferences: {
      currency: preferences.currency,
      reminderHour: preferences.reminderHour,
      viewFrequency: preferences.viewFrequency,
      viewChosen: preferences.viewChosen,
      accounts: preferences.accounts,
      balance: preferences.balance,
      balanceSetAt: preferences.balanceSetAt,
    },
  }
}

/**
 * Reads a backup file's text. Throws with a message to show when it is not a Budget Helper backup.
 * @returns {{ exportedAt: string | null, incomes: import('./models.js').Income[], bills: import('./models.js').Bill[], preferences: { currency: string, reminderHour: number, viewFrequency: import('./frequency.js').Frequency, viewChosen: boolean, accounts: import('./groups.js').Account[], balance: number | null, balanceSetAt: string | null } }}
 */
export function parseBackup(text, fallbackTimeZone, fallbackCurrency = 'USD') {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file is not a backup.')
  }
  if (!raw || typeof raw !== 'object' || raw.app !== BACKUP_APP) throw new Error('That file is not a Budget Helper backup.')
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new Error('That backup is from a newer version of Budget Helper.')
  }
  const preferences = parsePreferences(raw.preferences, fallbackCurrency)
  return {
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
    incomes: parseIncomes(raw.incomes),
    bills: parseBills(raw.bills, preferences.currency, fallbackTimeZone),
    preferences: {
      currency: preferences.currency,
      reminderHour: preferences.reminderHour,
      viewFrequency: preferences.viewFrequency,
      viewChosen: preferences.viewChosen,
      accounts: preferences.accounts,
      balance: preferences.balance,
      balanceSetAt: preferences.balanceSetAt,
    },
  }
}

/** `budget-backup-2026-10-22.json`, dated in local time. */
export function backupFileName(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `budget-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}
