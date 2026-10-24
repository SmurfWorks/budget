import { describe, expect, it } from 'vitest'
import { backupFileName, buildBackup, parseBackup } from './backup.js'
import { defaultPreferences } from './models.js'

const bill = {
  id: 'rent',
  name: 'Rent',
  amount: 120_000,
  currency: 'USD',
  rate: 1,
  rateSetAt: null,
  frequency: { unit: 'month', every: 1 },
  anchorDate: '2026-10-05',
  dueTime: '09:00',
  timezone: 'America/Los_Angeles',
  endDate: null,
  accountId: 'joint',
  tags: ['House'],
  paymentMethod: '',
  notes: '',
  remind: true,
}
const income = { id: 'pay', name: 'Pay', amount: 1_000_000, frequency: { unit: 'month', every: 1 }, anchorDate: '2026-10-15', notes: '' }

describe('backup', () => {
  it('round-trips income, bills and preferences, leaving out the reminder server', () => {
    const preferences = { ...defaultPreferences('USD'), accounts: [{ id: 'joint', name: 'Joint' }], balance: -2_500, balanceSetAt: '2026-10-20T00:00:00.000Z', pushUrl: 'https://push.example', pushToken: 'secret', notify: true }
    const file = JSON.stringify(buildBackup({ incomes: [income], bills: [bill], preferences }, new Date('2026-10-22T00:00:00Z')))
    expect(file).not.toContain('secret')
    const restored = parseBackup(file, 'UTC')
    expect(restored.bills).toEqual([bill])
    expect(restored.incomes).toEqual([income])
    expect(restored.preferences.currency).toBe('USD')
    expect(restored.preferences.accounts).toEqual([{ id: 'joint', name: 'Joint' }])
    expect(restored.preferences).toMatchObject({ balance: -2_500, balanceSetAt: '2026-10-20T00:00:00.000Z' })
  })

  it('refuses a file that is not a Budget Helper backup', () => {
    expect(() => parseBackup('not json', 'UTC')).toThrow('That file is not a backup.')
    expect(() => parseBackup(JSON.stringify({ app: 'dosage', version: 1 }), 'UTC')).toThrow('not a Budget Helper backup')
    expect(() => parseBackup(JSON.stringify({ app: 'budget', version: 9 }), 'UTC')).toThrow('newer version')
  })

  it('names the file by date', () => {
    expect(backupFileName(new Date(2026, 9, 22))).toBe('budget-backup-2026-10-22.json')
  })
})
