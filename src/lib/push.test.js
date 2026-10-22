import { describe, expect, it } from 'vitest'
import {
  applicationServerKey,
  checkPushConnection,
  deletePushDevice,
  pageOrigin,
  pushAuth,
  pushUrlIsReachable,
  replaceNotifications,
  syncNotificationKeys,
} from './push.js'

const auth = { baseUrl: 'http://push.example', token: 'app-token' }

function response(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  })
}

function recorder(serverNotifications) {
  const calls = []
  const fetchImpl = async (url, init) => {
    const method = init?.method ?? 'GET'
    calls.push({ method, url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined })
    if (method === 'GET') return response(200, { notifications: serverNotifications })
    if (method === 'DELETE') return response(204)
    return response(200, {})
  }
  return { calls, fetchImpl }
}

const booked = {
  key: 'slot-2026-11-04',
  deliverAt: '2026-11-04T17:00:00.000Z',
  title: 'Power goes out in the next 24 hours',
  body: '$100.00',
  tag: 'bills-2026-11-04',
  graceMinutes: 360,
}

const onServer = {
  key: 'slot-2026-11-04',
  deliver_at: '2026-11-04T17:00:00Z',
  title: booked.title,
  body: booked.body,
  tag: booked.tag,
  grace_minutes: 360,
  url: null,
  icon: null,
  status: 'pending',
}

describe('push server', () => {
  it('turns the public key into the bytes the phone expects', () => {
    expect([...applicationServerKey('aGVsbG8')]).toEqual([...new TextEncoder().encode('hello')])
  })

  it('ignores an address or token that cannot be used, and an http server from an https page', () => {
    expect(pushAuth('', 'token')).toBeNull()
    expect(pushAuth('not a server', 'token')).toBeNull()
    expect(pushAuth('https://push.example/', ' token ')).toEqual({ baseUrl: 'https://push.example', token: 'token' })
    expect(pushUrlIsReachable('http://push.example', 'https:')).toBe(false)
    expect(pageOrigin('https://smurfworks.github.io/sw-pwa-budget/')).toBe('https://smurfworks.github.io')
  })

  it('says when the token is not accepted or the server cannot be reached', async () => {
    await expect(checkPushConnection(auth, async () => response(401, {}))).resolves.toEqual({
      ok: false,
      message: 'That reminder server token was not accepted.',
    })
    await expect(
      checkPushConnection(auth, async () => {
        throw new TypeError('Failed to fetch')
      }),
    ).resolves.toEqual({ ok: false, message: 'Budget Helper could not reach that reminder server.' })
  })

  it('does not send a notification again when the server already has it unchanged', async () => {
    const { calls, fetchImpl } = recorder([onServer])
    await replaceNotifications(auth, 'device-1', [booked], fetchImpl)
    expect(calls.map((call) => call.method)).toEqual(['GET'])
  })

  it('books changed notifications and removes waiting ones that no longer apply, keeping ones already sent', async () => {
    const { calls, fetchImpl } = recorder([
      { ...onServer, body: 'old' },
      { ...onServer, key: 'slot-2026-11-01', status: 'pending' },
      { ...onServer, key: 'slot-2026-10-20', status: 'sent' },
    ])
    await replaceNotifications(auth, 'device-1', [booked], fetchImpl)
    expect(calls.slice(1).map((call) => `${call.method} ${call.url}`)).toEqual([
      'DELETE http://push.example/api/devices/device-1/notifications/slot-2026-11-01',
      'PUT http://push.example/api/devices/device-1/notifications/slot-2026-11-04',
    ])
    expect(calls[2].body).toMatchObject({ deliver_at: booked.deliverAt, grace_minutes: 360, tag: booked.tag })
  })

  it('syncs only the keys it is given', async () => {
    const { calls, fetchImpl } = recorder([
      { ...onServer, key: 'slot-2026-11-01' },
      { ...onServer, key: 'slot-2026-11-08' },
    ])
    await syncNotificationKeys(auth, 'device-1', ['slot-2026-11-01', 'slot-2026-11-04'], [booked, { ...booked, key: 'slot-2026-11-20' }], fetchImpl)
    expect(calls.slice(1).map((call) => `${call.method} ${call.url.split('/').pop()}`)).toEqual([
      'DELETE slot-2026-11-01',
      'PUT slot-2026-11-04',
    ])
  })

  it('unregisters this phone from the server', async () => {
    const { calls, fetchImpl } = recorder([])
    await deletePushDevice(auth, 'device-1', fetchImpl)
    expect(calls).toEqual([{ method: 'DELETE', url: 'http://push.example/api/devices/device-1', body: undefined }])
  })
})
