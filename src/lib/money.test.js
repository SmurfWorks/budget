import { describe, expect, it } from 'vitest'
import { amountInputValue, currencyDigits, formatMoney, parseAmount, parseRate, toBaseMinor } from './money.js'

describe('money', () => {
  it('reads typed amounts into minor units', () => {
    expect(parseAmount('1,200.50', 'USD')).toBe(120050)
    expect(parseAmount('$45', 'USD')).toBe(4500)
    expect(parseAmount('500', 'JPY')).toBe(500)
    expect(parseAmount('0.1', 'USD')).toBe(10)
    expect(parseAmount('', 'USD')).toBeNull()
    expect(parseAmount('-5', 'USD')).toBeNull()
    expect(parseAmount('12abc', 'USD')).toBeNull()
  })

  it('accepts only conversion rates above zero', () => {
    expect(parseRate('0.6')).toBe(0.6)
    expect(parseRate('0')).toBeNull()
    expect(parseRate('-1')).toBeNull()
    expect(parseRate('abc')).toBeNull()
  })

  it('converts an amount into the income currency, rounding to the nearest minor unit', () => {
    expect(toBaseMinor(12000, 'NZD', 0.6, 'USD')).toBe(7200)
    expect(toBaseMinor(333, 'NZD', 0.5, 'USD')).toBe(167)
    expect(toBaseMinor(1000, 'JPY', 0.0067, 'USD')).toBe(670)
    expect(toBaseMinor(5000, 'USD', 0.6, 'USD')).toBe(5000)
  })

  it('shows amounts in their currency', () => {
    expect(currencyDigits('JPY')).toBe(0)
    expect(formatMoney(120050, 'USD', 'en-US')).toBe('$1,200.50')
    expect(amountInputValue(120050, 'USD')).toBe('1200.50')
  })
})
