import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(root, { recursive: true })

const BLACK = [0, 0, 0, 255]

function crc32(buffer) {
  let c = ~0
  for (const byte of buffer) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

function png(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const start = y * (width * 4 + 1)
    raw[start] = 0
    pixels.copy(raw, start + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function inRoundRect(x, y, size, radius) {
  const px = x + 0.5
  const py = y + 0.5
  const cx = Math.min(Math.max(px, radius), size - radius)
  const cy = Math.min(Math.max(py, radius), size - radius)
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= radius * radius
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / length))
  const x = ax + t * dx
  const y = ay + t * dy
  return Math.hypot(px - x, py - y)
}

/** Signed distance to a rounded box: negative inside, positive outside. */
function roundBox(px, py, left, top, right, bottom, radius) {
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  const qx = Math.abs(px - cx) - ((right - left) / 2 - radius)
  const qy = Math.abs(py - cy) - ((bottom - top) / 2 - radius)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
}

// The glyph in a 0–1 square: a calendar with a wallet in front of its lower right corner.
// favicon.svg draws the same shapes at 64 units.
const CALENDAR = { left: 0.19, top: 0.26, right: 0.71, bottom: 0.74, radius: 0.07 }
const CALENDAR_HEADER = 0.39
const CALENDAR_RINGS = [0.33, 0.57]
const WALLET = { left: 0.47, top: 0.54, right: 0.81, bottom: 0.8, radius: 0.06 }
const CLASP = { left: 0.68, top: 0.62, bottom: 0.72 }
const WALLET_GAP = 0.045

function calendarWalletOutline(px, py, size, maskable) {
  const scale = maskable ? 0.78 : 1
  const u = (px / size - 0.5) / scale + 0.5
  const v = (py / size - 0.5) / scale + 0.5
  const wallet = Math.min(
    Math.abs(roundBox(u, v, WALLET.left, WALLET.top, WALLET.right, WALLET.bottom, WALLET.radius)),
    distanceToSegment(u, v, WALLET.right, CLASP.top, CLASP.left, CLASP.top),
    distanceToSegment(u, v, CLASP.left, CLASP.top, CLASP.left, CLASP.bottom),
    distanceToSegment(u, v, CLASP.left, CLASP.bottom, WALLET.right, CLASP.bottom),
  )
  const hidden = roundBox(u, v, WALLET.left, WALLET.top, WALLET.right, WALLET.bottom, WALLET.radius) < WALLET_GAP
  if (hidden) return wallet * size * scale
  const calendar = Math.min(
    Math.abs(roundBox(u, v, CALENDAR.left, CALENDAR.top, CALENDAR.right, CALENDAR.bottom, CALENDAR.radius)),
    distanceToSegment(u, v, CALENDAR.left, CALENDAR_HEADER, CALENDAR.right, CALENDAR_HEADER),
    ...CALENDAR_RINGS.map((x) => distanceToSegment(u, v, x, 0.2, x, 0.31)),
  )
  return Math.min(wallet, calendar) * size * scale
}

function paint(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4)
  const radius = maskable ? 0 : size * 0.22
  const stroke = size * (maskable ? 0.045 : 0.05)
  const edge = 0.85

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      if (!maskable && !inRoundRect(x, y, size, radius)) continue
      const distance = calendarWalletOutline(x + 0.5, y + 0.5, size, maskable)
      const coverage = Math.min(1, Math.max(0, (stroke / 2 + edge - distance) / (edge * 2)))
      const white = Math.round(255 * coverage)
      pixels[i] = white
      pixels[i + 1] = white
      pixels[i + 2] = white
      pixels[i + 3] = BLACK[3]
    }
  }
  return png(size, size, pixels)
}

writeFileSync(join(root, 'icon-192.png'), paint(192))
writeFileSync(join(root, 'icon-512.png'), paint(512))
writeFileSync(join(root, 'apple-touch-icon.png'), paint(180))
writeFileSync(join(root, 'icon-maskable-512.png'), paint(512, { maskable: true }))
