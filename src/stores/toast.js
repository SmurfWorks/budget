import { defineStore } from 'pinia'
import { ref } from 'vue'

const SHOW_MS = 5_000

/** A short message at the foot of the screen, with an optional Undo. */
export const useToastStore = defineStore('toast', () => {
  const message = ref('')
  /** @type {import('vue').Ref<(() => void) | null>} */
  const undo = ref(null)
  let timer = 0

  function show(text, onUndo = null) {
    clearTimeout(timer)
    message.value = text
    undo.value = onUndo
    timer = setTimeout(hide, SHOW_MS)
  }

  function hide() {
    clearTimeout(timer)
    message.value = ''
    undo.value = null
  }

  function runUndo() {
    const action = undo.value
    hide()
    action?.()
  }

  return { message, undo, show, hide, runUndo }
})
