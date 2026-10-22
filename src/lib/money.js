/**
 * Amounts are whole minor units of their currency: cents for dollars, yen for yen.
 */

const FALLBACK_CURRENCIES = ['AUD', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'HKD', 'INR', 'JPY', 'NZD', 'SGD', 'USD']

export function isCurrency(value) {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) return false
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: value })
    return true
  } catch {
    return false
  }
}

/** Digits after the decimal point: 2 for USD, 0 for JPY. */
export function currencyDigits(currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

export function currencyList() {
  try {
    const list = Intl.supportedValuesOf?.('currency')
    if (list && list.length > 0) return [...list]
  } catch {
    // Older browsers have no list.
  }
  return FALLBACK_CURRENCIES
}

/** The currency this browser's region uses, or USD. */
export function browserCurrency() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region
    const byRegion = { US: 'USD', NZ: 'NZD', AU: 'AUD', GB: 'GBP', CA: 'CAD', JP: 'JPY', IN: 'INR', SG: 'SGD', CH: 'CHF' }
    if (region && byRegion[region]) return byRegion[region]
  } catch {
    // Fall through.
  }
  return 'USD'
}

/**
 * `$1,200.50`, `NZ$72.00`, `¥500`. With `narrow`, the plain symbol (`$`) is used even where the
 * locale would write `US$`: for amounts in your income currency, where there is no doubt which it is.
 */
export function formatMoney(minor, currency, locale, { narrow = false } = {}) {
  const digits = currencyDigits(currency)
  return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: narrow ? 'narrowSymbol' : 'symbol' })
    .format(minor / 10 ** digits)
}

/** The plain number for an input box: `1200.50`. */
export function amountInputValue(minor, currency) {
  const digits = currencyDigits(currency)
  return (minor / 10 ** digits).toFixed(digits)
}

/**
 * Reads a typed amount such as `1,200.50` or `$45`. Returns minor units, or null when it is not a
 * number of zero or more.
 */
export function parseAmount(text, currency) {
  if (typeof text !== 'string' || text.includes('-')) return null
  const cleaned = text.replace(/[\s,]/g, '').replace(/^[^\d.]+/, '')
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 10 ** currencyDigits(currency))
}

/** A conversion rate: a number above zero. */
export function parseRate(text) {
  const value = typeof text === 'number' ? text : Number(String(text ?? '').trim())
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

/**
 * An amount in another currency, converted to the base currency.
 * `rate` is how much one unit of `currency` is worth in `baseCurrency`.
 */
export function toBaseMinor(minor, currency, rate, baseCurrency) {
  if (currency === baseCurrency) return minor
  const major = minor / 10 ** currencyDigits(currency)
  return Math.round(major * rate * 10 ** currencyDigits(baseCurrency))
}
