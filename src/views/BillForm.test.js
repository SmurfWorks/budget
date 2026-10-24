// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBudgetStore } from '@/stores/budget.js'
import { usePreferencesStore } from '@/stores/preferences.js'
import BillForm from './BillForm.vue'

describe('BillForm', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    usePreferencesStore().currency = 'USD'
  })

  it('adds a bill in another currency with its conversion rate', async () => {
    const wrapper = mount(BillForm)
    await wrapper.find('#bill-name').setValue('Phone')
    await wrapper.find('#bill-amount').setValue('50')
    await wrapper.find('#bill-currency').setValue('NZD')
    await wrapper.find('#bill-rate').setValue('0.6')
    await wrapper.find('form').trigger('submit')

    const [bill] = useBudgetStore().bills
    expect(bill).toMatchObject({ name: 'Phone', amount: 5000, currency: 'NZD', rate: 0.6, remind: true })
  })

  it('shows what is wrong and saves nothing when the amount cannot be read', async () => {
    const wrapper = mount(BillForm)
    await wrapper.find('#bill-name').setValue('Rent')
    await wrapper.find('#bill-amount').setValue('lots')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[role="alert"]').text()).toContain('Enter the amount')
    expect(useBudgetStore().bills).toEqual([])
  })

  it('saves the account and tags, adding a typed tag with Enter in the spelling you already use', async () => {
    const preferences = usePreferencesStore()
    preferences.addAccount('Joint')
    const budget = useBudgetStore()
    budget.bills.push({ id: 'old', name: 'Old', amount: 1, currency: 'USD', rate: 1, frequency: { unit: 'month', every: 1 }, anchorDate: '2026-10-01', dueTime: '09:00', timezone: 'UTC', endDate: null, accountId: null, tags: ['Work'], paymentMethod: '', notes: '', remind: false })
    const wrapper = mount(BillForm)
    await wrapper.find('#bill-name').setValue('Rent')
    await wrapper.find('#bill-amount').setValue('1200')
    await wrapper.find('#bill-account').setValue(preferences.accounts[0].id)
    await wrapper.find('#bill-tags').setValue('work')
    await wrapper.find('#bill-tags').trigger('keydown', { key: 'Enter' })
    await wrapper.find('#bill-tags').setValue('House')
    await wrapper.find('#bill-tags').trigger('keydown', { key: ',' })
    await wrapper.find('form').trigger('submit')

    const bill = budget.bills.find((item) => item.name === 'Rent')
    expect(bill).toMatchObject({ accountId: preferences.accounts[0].id, tags: ['Work', 'House'] })
  })
})
