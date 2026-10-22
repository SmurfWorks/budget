<script setup>
import { onMounted } from 'vue'
import { useAbout } from '@/composables/useAbout.js'
import AppDialog from './AppDialog.vue'

const { open, showOnFirstVisit } = useAbout()

onMounted(showOnFirstVisit)
</script>

<template>
  <AppDialog v-model:open="open" title="How it works">
    <p class="mt-0">
      Add your <strong>income</strong> and your <strong>bills</strong>, with how often each one comes in or goes out.
      Budget Helper works out what each costs in a year, then shows your budget per week, fortnight, month or year,
      and what is left to spend.
    </p>
    <p>
      A bill can be in another currency. Give it a conversion rate and it is counted in your income currency.
    </p>
    <p>
      Turn on reminders in Settings, and each day at your reminder hour you get one notification for the bills that go
      out in the next 24 hours, wherever their timezone is.
    </p>
    <p class="mb-0 text-muted">Everything is kept on this phone. Only reminder times and wording go to your reminder server.</p>
    <template #actions>
      <button type="button" class="btn" @click="open = false">Got it</button>
    </template>
  </AppDialog>
</template>
