// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBudgetStore } from './budget.js'
import { useDataStore } from './data.js'

const device = { id: 'device-1', baseUrl: 'https://push.example', token: 'app-token', timezone: 'UTC' }
const income = { id: 'pay', name: 'Pay', amount: 100_000, frequency: { unit: 'month', every: 1 }, anchorDate: '2026-10-15', notes: '' }

describe('Delete all data', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('budget.push-device.v1', JSON.stringify(device))
    localStorage.setItem('budget.incomes.v1', JSON.stringify([income]))
    localStorage.setItem('unrelated', 'kept')
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('removes the reminders and this phone from the server, then everything stored here', async () => {
    const calls = []
    vi.stubGlobal('fetch', async (url, init) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`)
      return new Response(null, { status: 204 })
    })
    expect(useBudgetStore().incomes).toHaveLength(1)

    await useDataStore().deleteAllData()

    expect(calls).toEqual([
      'DELETE https://push.example/api/devices/device-1/notifications',
      'DELETE https://push.example/api/devices/device-1',
    ])
    expect(useBudgetStore().incomes).toEqual([])
    expect(Object.keys(localStorage).filter((key) => key.startsWith('budget.'))).toEqual([])
    expect(localStorage.getItem('unrelated')).toBe('kept')
  })

  it('stops before deleting anything here when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })

    await expect(useDataStore().deleteAllData()).rejects.toThrow()
    expect(useBudgetStore().incomes).toHaveLength(1)

    await useDataStore().deleteAllData({ localOnly: true })
    expect(useBudgetStore().incomes).toEqual([])
    expect(localStorage.getItem('budget.push-device.v1')).toBeNull()
  })
})
