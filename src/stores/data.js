import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import { backupFileName, buildBackup, parseBackup } from '@/lib/backup.js'
import { downloadText } from '@/lib/download.js'
import { clearAllStorage } from '@/lib/storage.js'
import { useBudgetStore } from './budget.js'
import { usePreferencesStore } from './preferences.js'
import { useRemindersStore } from './reminders.js'

/** Backups, restores, and deleting everything. */
export const useDataStore = defineStore('data', () => {
  function backupText() {
    const budget = useBudgetStore()
    const preferences = usePreferencesStore()
    return JSON.stringify(
      buildBackup({ incomes: budget.incomes, bills: budget.bills, preferences }),
      null,
      2,
    )
  }

  /** Saves a backup file to the phone. */
  function exportBackup() {
    downloadText(backupText(), backupFileName(), 'application/json')
  }

  /** Reads a backup file, throwing a message to show when it cannot be used. */
  async function readBackup(file) {
    const preferences = usePreferencesStore()
    return parseBackup(await file.text(), preferences.timezone, preferences.currency)
  }

  /** Replaces everything on this phone with a backup, then re-books reminders. */
  function restoreBackup(backup) {
    usePreferencesStore().applyBackup(backup.preferences)
    useBudgetStore().replaceAll(backup)
    return useRemindersStore().syncAll()
  }

  /**
   * Removes the reminders and this phone from the reminder server, then everything stored here.
   * With `localOnly`, the server is not contacted (for when it cannot be reached).
   */
  async function deleteAllData({ localOnly = false } = {}) {
    if (!localOnly) await useRemindersStore().deleteRemote()
    clearAllStorage()
    useBudgetStore().reset()
    usePreferencesStore().reset()
    useRemindersStore().reset()
    // Resetting writes defaults back; clear again so nothing is left until you change something.
    await nextTick()
    clearAllStorage()
  }

  return { backupText, exportBackup, readBackup, restoreBackup, deleteAllData }
})
