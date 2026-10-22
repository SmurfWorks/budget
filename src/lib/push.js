/**
 * Registering this phone with the reminder server (sw-pwa-push) and booking notifications there.
 * @typedef {{ baseUrl: string, token: string }} PushAuth
 * @typedef {{ key: string, deliverAt: string, title: string, body: string, tag?: string, graceMinutes?: number, url?: string, icon?: string }} BookedNotification
 */

const DEVICE_KEY = 'budget.push-device.v1'
const DEFAULT_GRACE_MINUTES = 30

/** Address and token from Settings. Empty or unusable values do not book anything. @returns {PushAuth | null} */
export function pushAuth(url, token) {
  const trimmedToken = String(token ?? '').trim()
  const baseUrl = String(url ?? '').trim().replace(/\/$/, '')
  if (!trimmedToken || !baseUrl) return null
  try {
    const parsed = new URL(baseUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (parsed.username || parsed.password) return null
  } catch {
    return null
  }
  return { baseUrl, token: trimmedToken }
}

/** Scheme, host and port of a page, without the path. */
export function pageOrigin(pageUrl) {
  return new URL(pageUrl).origin
}

/** A secure page cannot call an http server, so booking waits until the address is https. */
export function pushUrlIsReachable(baseUrl, pageProtocol) {
  try {
    return !(pageProtocol === 'https:' && new URL(baseUrl).protocol === 'http:')
  } catch {
    return false
  }
}

/** The bytes `pushManager.subscribe` expects for the server's public key. */
export function applicationServerKey(publicKey) {
  const padding = '='.repeat((4 - (publicKey.length % 4)) % 4)
  const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** @returns {{ id: string, baseUrl: string, token: string, timezone: string } | null} */
export function readDevice() {
  const raw = storage()?.getItem(DEVICE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.id === 'string' && typeof parsed.baseUrl === 'string' && typeof parsed.token === 'string') {
      return {
        id: parsed.id,
        baseUrl: parsed.baseUrl,
        token: parsed.token,
        timezone: typeof parsed.timezone === 'string' ? parsed.timezone : '',
      }
    }
  } catch {
    // Unreadable: treat this phone as not registered.
  }
  return null
}

/** @param {PushAuth} auth */
export function storedPushDeviceId(auth) {
  const stored = readDevice()
  if (!stored || stored.baseUrl !== auth.baseUrl || stored.token !== auth.token) return null
  return stored.id
}

function rememberDevice(auth, id, timezone) {
  storage()?.setItem(DEVICE_KEY, JSON.stringify({ id, baseUrl: auth.baseUrl, token: auth.token, timezone }))
}

export function forgetPushDevice() {
  storage()?.removeItem(DEVICE_KEY)
}

function authHeaders(auth, json = false) {
  return {
    Authorization: `Bearer ${auth.token}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  }
}

/** Confirms the address and token are accepted. A list of devices is enough; nothing is booked. */
export async function checkPushConnection(auth, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${auth.baseUrl}/api/devices`, { headers: authHeaders(auth) })
    if (response.status === 401) return { ok: false, message: 'That reminder server token was not accepted.' }
    if (!response.ok) return { ok: false, message: `The reminder server responded ${response.status}.` }
    return { ok: true }
  } catch {
    return { ok: false, message: 'Budget Helper could not reach that reminder server.' }
  }
}

function validationError(message) {
  if (/timezone/i.test(message)) return 'Choose a timezone the reminder server knows.'
  if (/does not exist/i.test(message)) return 'That reminder time does not exist in your timezone.'
  if (/register a timezone/i.test(message)) return 'Choose your timezone before reminders can be booked.'
  return "Register this app's origin on the reminder server."
}

async function asJson(response, forgetOnMissing = false) {
  if (response.status === 404 && forgetOnMissing) {
    forgetPushDevice()
    throw new Error('This phone is no longer registered for reminders.')
  }
  if (response.status === 422) {
    let message = ''
    try {
      const body = await response.json()
      if (typeof body.message === 'string') message = body.message
    } catch {
      // The status is enough when the server sends no details.
    }
    throw new Error(validationError(message))
  }
  if (!response.ok) throw new Error(`The reminder server responded ${response.status}.`)
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function postDevice(auth, timezone, subscription, fetchImpl) {
  const response = await fetchImpl(`${auth.baseUrl}/api/devices`, {
    method: 'POST',
    headers: authHeaders(auth, true),
    body: JSON.stringify({ timezone, subscription: subscription.toJSON() }),
  })
  const body = await asJson(response)
  if (!body?.id) throw new Error('The reminder server did not register this phone.')
  rememberDevice(auth, body.id, timezone)
  return body.id
}

/**
 * Registers this phone, or updates its timezone when that has changed.
 * A phone already registered for this server keeps its subscription.
 * @returns {Promise<string | null>}
 */
export async function ensurePushDevice(auth, timezone, fetchImpl = fetch) {
  const stored = readDevice()
  const sameServer = stored !== null && stored.baseUrl === auth.baseUrl && stored.token === auth.token
  if (sameServer && stored.timezone === timezone) return stored.id
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return sameServer ? stored.id : null
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return sameServer ? stored.id : null
  if (typeof window === 'undefined' || !('PushManager' in window)) return sameServer ? stored.id : null
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration?.pushManager) return sameServer ? stored.id : null

  const current = await registration.pushManager.getSubscription()
  if (sameServer && current) return postDevice(auth, timezone, current, fetchImpl)
  if (sameServer) return stored.id

  if (current) await current.unsubscribe()
  const keyResponse = await fetchImpl(`${auth.baseUrl}/api/vapid-public-key`, { headers: { Accept: 'application/json' } })
  const keyBody = await asJson(keyResponse)
  if (!keyBody?.publicKey) throw new Error('The reminder server has no public key.')
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(keyBody.publicKey),
  })
  return postDevice(auth, timezone, subscription, fetchImpl)
}

function payload(item) {
  return {
    deliver_at: item.deliverAt,
    title: item.title,
    body: item.body,
    tag: item.tag ?? null,
    grace_minutes: item.graceMinutes ?? DEFAULT_GRACE_MINUTES,
    url: item.url ?? null,
    icon: item.icon ?? null,
  }
}

/** Whether the server already has this notification exactly as wanted, so it need not be sent again. */
export function sameAsBooked(existing, item) {
  if (!existing) return false
  const wanted = payload(item)
  return (
    Date.parse(existing.deliver_at) === Date.parse(wanted.deliver_at) &&
    existing.title === wanted.title &&
    existing.body === wanted.body &&
    (existing.tag ?? null) === wanted.tag &&
    Number(existing.grace_minutes) === wanted.grace_minutes &&
    (existing.url ?? null) === wanted.url &&
    (existing.icon ?? null) === wanted.icon
  )
}

/**
 * Makes the server match `wanted` for the keys `inScope` accepts. Waiting notifications that are no
 * longer wanted are removed; ones already sent or skipped stay as a record of when they went out.
 * Notifications the server already has unchanged are not sent again.
 */
async function reconcile(auth, deviceId, wanted, inScope, fetchImpl) {
  const root = `${auth.baseUrl}/api/devices/${deviceId}/notifications`
  const current = await asJson(await fetchImpl(root, { headers: authHeaders(auth) }), true)
  const existingByKey = new Map((current?.notifications ?? []).map((item) => [item.key, item]))
  const keys = new Set(wanted.map((item) => item.key))

  for (const existing of existingByKey.values()) {
    if (!inScope(existing.key) || keys.has(existing.key)) continue
    if (existing.status === 'sent' || existing.status === 'skipped') continue
    const removed = await fetchImpl(`${root}/${encodeURIComponent(existing.key)}`, {
      method: 'DELETE',
      headers: authHeaders(auth),
    })
    if (removed.status === 404) continue
    await asJson(removed)
  }

  for (const item of wanted) {
    if (sameAsBooked(existingByKey.get(item.key), item)) continue
    await asJson(
      await fetchImpl(`${root}/${encodeURIComponent(item.key)}`, {
        method: 'PUT',
        headers: authHeaders(auth, true),
        body: JSON.stringify(payload(item)),
      }),
    )
  }
}

/** Books exactly `wanted` for this phone. @param {BookedNotification[]} wanted */
export function replaceNotifications(auth, deviceId, wanted, fetchImpl = fetch) {
  return reconcile(auth, deviceId, wanted, () => true, fetchImpl)
}

/**
 * Re-books only the given keys, leaving every other notification as it is.
 * @param {Iterable<string>} keys @param {BookedNotification[]} wanted
 */
export function syncNotificationKeys(auth, deviceId, keys, wanted, fetchImpl = fetch) {
  const scope = new Set(keys)
  return reconcile(
    auth,
    deviceId,
    wanted.filter((item) => scope.has(item.key)),
    (key) => scope.has(key),
    fetchImpl,
  )
}

/** Removes every notification booked for this phone, including ones already sent. */
export async function clearNotifications(auth, deviceId, fetchImpl = fetch) {
  await asJson(
    await fetchImpl(`${auth.baseUrl}/api/devices/${deviceId}/notifications`, {
      method: 'DELETE',
      headers: authHeaders(auth),
    }),
    true,
  )
}

/** Unregisters this phone from the server, which also removes its notifications. */
export async function deletePushDevice(auth, deviceId, fetchImpl = fetch) {
  const response = await fetchImpl(`${auth.baseUrl}/api/devices/${deviceId}`, {
    method: 'DELETE',
    headers: authHeaders(auth),
  })
  if (response.status !== 404) await asJson(response)
  forgetPushDevice()
}
