<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { currencyDigits, formatMoney } from '@/lib/money.js'
import { formatDateKey } from '@/lib/zoned.js'

/** One line: the money in your accounts at the end of each day, from `balanceForecast`. */
const props = defineProps({
  points: { type: Array, required: true },
  currency: { type: String, required: true },
})

const HEIGHT = 190
const TOP = 14
const BOTTOM = 26
const SIDE = 4

const box = ref(null)
const width = ref(320)
const active = ref(null)
const clipId = useId()

let observer = null
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    width.value = Math.max(200, Math.round(entry.contentRect.width))
  })
  observer.observe(box.value)
})
onBeforeUnmount(() => observer?.disconnect())

const money = (minor) => formatMoney(minor, props.currency, undefined, { narrow: true })
/** `$1.2k`, `-$300`: short amounts for the axis. */
function shortMoney(minor) {
  const major = minor / 10 ** currencyDigits(props.currency)
  const abs = Math.abs(major)
  const sign = major < 0 ? '-' : ''
  const symbol = formatMoney(0, props.currency, undefined, { narrow: true }).replace(/[\d.,\s]/g, '')
  if (abs >= 1_000_000) return `${sign}${symbol}${+(abs / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000) return `${sign}${symbol}${+(abs / 1_000).toFixed(1)}k`
  return `${sign}${symbol}${Math.round(abs)}`
}

/** A round step for about four gridlines. */
function niceStep(range) {
  const rough = range / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  return [1, 2, 2.5, 5, 10].map((m) => m * power).find((step) => step >= rough)
}

const scale = computed(() => {
  const values = props.points.flatMap((point) => [point.low, point.close])
  let min = Math.min(0, ...values)
  let max = Math.max(0, ...values)
  if (max === min) max = min + 10_000
  const step = niceStep(max - min)
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  const ticks = []
  for (let value = min; value <= max + step / 2; value += step) ticks.push(value)
  const plot = HEIGHT - TOP - BOTTOM
  const y = (value) => TOP + ((max - value) / (max - min)) * plot
  const span = Math.max(1, props.points.length - 1)
  const x = (index) => SIDE + (index / span) * (width.value - SIDE * 2)
  return { ticks, x, y }
})

/** A step line: each day's amount holds until the next day's. */
const linePath = computed(() => {
  const { x, y } = scale.value
  return props.points
    .map((point, index) => (index === 0 ? `M${x(0)},${y(point.close)}` : `H${x(index)}V${y(point.close)}`))
    .join('')
})
const areaPath = computed(() => {
  const { x, y } = scale.value
  const zero = y(0)
  return `${linePath.value}H${x(props.points.length - 1)}V${zero}H${x(0)}Z`
})
const zeroY = computed(() => scale.value.y(0))

/** The first day, then the first of each month, leaving out labels that would crowd. */
const xLabels = computed(() => {
  const { x } = scale.value
  const labels = [{ index: 0, text: 'Today', anchor: 'start' }]
  const days = props.points.length
  props.points.forEach((point, index) => {
    if (index === 0) return
    const first = point.dateKey.endsWith('-01')
    const weekly = days <= 35 && index % 7 === 0
    if (!first && !weekly) return
    const text = formatDateKey(point.dateKey, undefined, weekly && !first ? { day: 'numeric', month: 'short' } : { month: 'short' })
    labels.push({ index, text, anchor: 'middle' })
  })
  const kept = []
  for (const label of labels) {
    const previous = kept.at(-1)
    if (previous && x(label.index) - x(previous.index) < 46) continue
    if (x(label.index) > width.value - 22) continue
    kept.push(label)
  }
  return kept
})

const activePoint = computed(() => (active.value === null ? null : props.points[active.value]))
const tooltipLeft = computed(() => {
  if (active.value === null) return 0
  return Math.min(Math.max(scale.value.x(active.value) - 90, 0), width.value - 180)
})

function pick(event) {
  const rect = box.value.getBoundingClientRect()
  const ratio = (event.clientX - rect.left - SIDE) / (rect.width - SIDE * 2)
  active.value = Math.min(props.points.length - 1, Math.max(0, Math.round(ratio * (props.points.length - 1))))
}

function onLeave(event) {
  if (event.pointerType === 'mouse') active.value = null
}

function onKey(event) {
  const last = props.points.length - 1
  const moves = { ArrowRight: 1, ArrowLeft: -1, PageDown: 7, PageUp: -7 }
  if (event.key === 'Home') active.value = 0
  else if (event.key === 'End') active.value = last
  else if (event.key === 'Escape') active.value = null
  else if (moves[event.key]) active.value = Math.min(last, Math.max(0, (active.value ?? 0) + moves[event.key]))
  else return
  event.preventDefault()
}

function eventLine(item) {
  return `${item.name} ${item.amount < 0 ? '−' : '+'}${money(Math.abs(item.amount))}`
}
</script>

<template>
  <div ref="box" class="relative min-w-0 select-none">
    <svg
      width="100%"
      :height="HEIGHT"
      :viewBox="`0 0 ${width} ${HEIGHT}`"
      class="block touch-pan-y overflow-visible outline-none focus-visible:rounded-lg focus-visible:ring-4 focus-visible:ring-focus-ring"
      role="img"
      tabindex="0"
      aria-label="Money in your accounts each day. Use the arrow keys to read each day."
      @pointerdown="pick"
      @pointermove="pick"
      @pointerleave="onLeave"
      @keydown="onKey"
      @blur="active = null"
    >
      <defs>
        <clipPath :id="`${clipId}-above`"><rect x="0" y="0" :width="width" :height="zeroY" /></clipPath>
        <clipPath :id="`${clipId}-below`"><rect x="0" :y="zeroY" :width="width" :height="HEIGHT" /></clipPath>
      </defs>

      <g class="text-[10px]" fill="var(--muted)">
        <template v-for="tick in scale.ticks" :key="tick">
          <line :x1="0" :x2="width" :y1="scale.y(tick)" :y2="scale.y(tick)" :stroke="tick === 0 ? 'var(--muted)' : 'var(--line)'" stroke-width="1" />
          <text :x="SIDE" :y="scale.y(tick) - 4" class="tabular-nums">{{ shortMoney(tick) }}</text>
        </template>
        <text v-for="label in xLabels" :key="label.index" :x="scale.x(label.index)" :y="HEIGHT - 8" :text-anchor="label.anchor">{{ label.text }}</text>
      </g>

      <g :clip-path="`url(#${clipId}-above)`">
        <path :d="areaPath" fill="var(--teal)" fill-opacity="0.1" />
        <path :d="linePath" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      </g>
      <g :clip-path="`url(#${clipId}-below)`">
        <path :d="areaPath" fill="var(--warn)" fill-opacity="0.12" />
        <path :d="linePath" fill="none" stroke="var(--warn)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      </g>

      <g v-if="activePoint">
        <line :x1="scale.x(active)" :x2="scale.x(active)" :y1="TOP - 6" :y2="HEIGHT - BOTTOM" stroke="var(--muted)" stroke-width="1" />
        <circle
          :cx="scale.x(active)"
          :cy="scale.y(activePoint.close)"
          r="4.5"
          :fill="activePoint.close < 0 ? 'var(--warn)' : 'var(--teal)'"
          stroke="var(--card)"
          stroke-width="2"
        />
      </g>
    </svg>

    <div
      v-if="activePoint"
      class="pointer-events-none absolute bottom-full z-10 mb-1 w-[180px] rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-card"
      :style="{ left: `${tooltipLeft}px` }"
      role="status"
    >
      <span class="block text-muted">{{ active === 0 ? 'Today' : formatDateKey(activePoint.dateKey) }}</span>
      <span class="block font-semibold tabular-nums" :class="activePoint.close < 0 ? 'text-warn' : 'text-ink'">{{ money(activePoint.close) }}</span>
      <span v-for="(item, index) in activePoint.events.slice(0, 3)" :key="index" class="block truncate text-xs text-muted tabular-nums">
        {{ eventLine(item) }}
      </span>
      <span v-if="activePoint.events.length > 3" class="block text-xs text-muted">+{{ activePoint.events.length - 3 }} more</span>
    </div>
  </div>
</template>
