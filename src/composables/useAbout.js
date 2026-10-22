import { ref } from 'vue'
import { KEYS, readFlag, writeFlag } from '@/lib/storage.js'

const open = ref(false)

/** "How it works", opened by the ? button and shown once on the first visit. */
export function useAbout() {
  function showOnFirstVisit() {
    if (readFlag(KEYS.aboutSeen)) return
    writeFlag(KEYS.aboutSeen)
    open.value = true
  }

  return { open, showOnFirstVisit }
}
