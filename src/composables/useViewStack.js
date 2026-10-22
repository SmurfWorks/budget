import { ref } from 'vue'

/**
 * Screens that slide in over the home screen. Each one is a history entry, so the phone's back
 * gesture closes the top screen instead of leaving the app.
 * @type {import('vue').Ref<Array<{ id: number, name: string, props: Record<string, unknown> }>>}
 */
const stack = ref([])
let nextId = 1
let listening = false

function onPopState() {
  stack.value.pop()
}

export function useViewStack() {
  if (!listening && typeof window !== 'undefined') {
    window.addEventListener('popstate', onPopState)
    listening = true
  }

  function open(name, props = {}) {
    stack.value.push({ id: nextId++, name, props })
    history.pushState({ budgetScreen: stack.value.length }, '')
  }

  function back() {
    if (stack.value.length > 0) history.back()
  }

  /** Closes every screen, back to home. */
  function home() {
    const depth = stack.value.length
    if (depth > 0) history.go(-depth)
  }

  return { stack, open, back, home }
}
