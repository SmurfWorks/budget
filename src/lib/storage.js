/** Every key Budget Helper keeps in this browser starts with this. */
export const STORAGE_PREFIX = 'budget.'

export const KEYS = {
  bills: 'budget.bills.v1',
  incomes: 'budget.incomes.v1',
  preferences: 'budget.preferences.v1',
  timezone: 'budget.timezone.v1',
  aboutSeen: 'budget.about-seen',
  installDismissed: 'budget.install-dismissed',
}

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** A stored JSON value, or `fallback` when it is missing, unreadable, or storage is blocked. */
export function readJson(key, fallback = null) {
  try {
    const raw = storage()?.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  try {
    storage()?.setItem(key, JSON.stringify(value))
  } catch {
    // Private browsing or a full disk: the app keeps working for this visit.
  }
}

export function readFlag(key) {
  try {
    return storage()?.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeFlag(key) {
  try {
    storage()?.setItem(key, '1')
  } catch {
    // As above.
  }
}

/** Removes every Budget Helper key from this browser. */
export function clearAllStorage() {
  const store = storage()
  if (!store) return
  try {
    const keys = []
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index)
      if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key)
    }
    for (const key of keys) store.removeItem(key)
  } catch {
    // Nothing more can be done when storage is blocked.
  }
}
