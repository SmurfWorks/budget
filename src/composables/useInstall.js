import { computed, ref } from 'vue'
import { currentBrowser, installCopy, installsManually } from '@/lib/device.js'
import { KEYS, readFlag, writeFlag } from '@/lib/storage.js'

/** The browser's install prompt, saved when it arrives so the banner can offer it later. */
const promptEvent = ref(null)
const dismissed = ref(readFlag(KEYS.installDismissed))
const installed = ref(
  typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || currentBrowser().standalone === true),
)

export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    promptEvent.value = event
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    promptEvent.value = null
  })
}

export function useInstall() {
  const browser = currentBrowser()
  const manual = installsManually(browser)
  const visible = computed(() => !installed.value && !dismissed.value && (manual || promptEvent.value !== null))

  async function install() {
    const event = promptEvent.value
    if (!event) return
    event.prompt()
    await event.userChoice.catch(() => null)
    promptEvent.value = null
  }

  function dismiss() {
    dismissed.value = true
    writeFlag(KEYS.installDismissed)
  }

  return { visible, manual, copy: installCopy(browser), install, dismiss }
}
