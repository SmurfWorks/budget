<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import AboutDialog from './components/AboutDialog.vue'
import AppToast from './components/AppToast.vue'
import { useViewStack } from './composables/useViewStack.js'
import { useBudgetStore } from './stores/budget.js'
import { useRemindersStore } from './stores/reminders.js'
import BillForm from './views/BillForm.vue'
import BillsView from './views/BillsView.vue'
import HomeView from './views/HomeView.vue'
import IncomeForm from './views/IncomeForm.vue'
import IncomeView from './views/IncomeView.vue'
import SettingsView from './views/SettingsView.vue'

const screens = {
  bills: BillsView,
  'bill-edit': BillForm,
  incomes: IncomeView,
  'income-edit': IncomeForm,
  settings: SettingsView,
}

const { stack, back } = useViewStack()
const budget = useBudgetStore()
const reminders = useRemindersStore()

function onVisible() {
  if (document.visibilityState !== 'visible') return
  budget.refreshNow()
  reminders.syncAll()
}

function onKey(event) {
  if (event.key === 'Escape' && stack.value.length > 0 && !document.querySelector('dialog[open]')) back()
}

onMounted(() => {
  reminders.syncAll()
  document.addEventListener('visibilitychange', onVisible)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisible)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <HomeView class="screen z-[1]" :class="{ parked: stack.length > 0 }" :inert="stack.length > 0" />
  <TransitionGroup name="slide">
    <component
      :is="screens[entry.name]"
      v-for="(entry, index) in stack"
      :key="entry.id"
      v-bind="entry.props"
      class="screen"
      :class="{ parked: index < stack.length - 1 }"
      :style="{ zIndex: index + 2 }"
      :inert="index < stack.length - 1"
    />
  </TransitionGroup>
  <AppToast />
  <AboutDialog />
</template>
