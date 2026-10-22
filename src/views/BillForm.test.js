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
})
