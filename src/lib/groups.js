import { timesPerYear } from './frequency.js'
import { toBaseMinor } from './money.js'

export const TAG_MAX = 40
export const TAGS_PER_BILL = 12

/**
 * @typedef {object} Account
 * @property {string} id
 * @property {string} name
 */

/** A tag as typed, tidied: trimmed, single spaces, at most 40 characters. Empty when there is nothing. */
export function cleanTag(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, TAG_MAX).trim() : ''
}

function sameTag(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
}

/**
 * A bill's tags with one more added. A tag you already use elsewhere keeps the spelling it has there,
 * so `work` joins `Work`. Adding one the bill already has, or nothing, changes nothing.
 * @param {string[]} tags
 * @param {string[]} known Tags already used on any bill.
 */
export function addTag(tags, value, known = []) {
  const tag = cleanTag(value)
  if (!tag || tags.length >= TAGS_PER_BILL || tags.some((item) => sameTag(item, tag))) return tags
  return [...tags, known.find((item) => sameTag(item, tag)) ?? tag]
}

/** Stored tags, tidied, without repeats. */
export function parseTags(raw) {
  if (!Array.isArray(raw)) return []
  return raw.reduce((tags, value) => addTag(tags, value), [])
}

/** Stored accounts: each needs an id and a name, and names are not repeated. @returns {Account[]} */
export function parseAccounts(raw) {
  if (!Array.isArray(raw)) return []
  const accounts = []
  for (const item of raw) {
    const name = cleanTag(item?.name)
    if (typeof item?.id !== 'string' || !item.id || !name) continue
    if (accounts.some((account) => account.id === item.id || sameTag(account.name, name))) continue
    accounts.push({ id: item.id, name })
  }
  return accounts
}

/**
 * Checks an account name for adding or renaming. Returns the name to keep, or the problem to show.
 * @param {Account[]} accounts
 * @param {string | null} id The account being renamed, or null for a new one.
 */
export function checkAccountName(accounts, value, id = null) {
  const name = cleanTag(value)
  if (!name) return { name: null, error: 'Give the account a name.' }
  const existing = accounts.find((account) => account.id !== id && sameTag(account.name, name))
  if (existing) return { name: null, error: `You already have ${existing.name}.` }
  return { name, error: null }
}

/**
 * Every tag your bills use, most used first then by name, each with how many bills have it.
 * @param {import('./models.js').Bill[]} bills
 */
export function tagOptions(bills) {
  const options = []
  for (const bill of bills) {
    for (const tag of bill.tags) {
      const found = options.find((option) => sameTag(option.tag, tag))
      if (found) found.count += 1
      else options.push({ tag, count: 1 })
    }
  }
  return options.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** Tags you have used that start with, or contain, what is typed, leaving out those already chosen. */
export function suggestTags(known, typed, chosen = []) {
  const query = cleanTag(typed).toLocaleLowerCase()
  const free = known.filter((tag) => !chosen.some((item) => sameTag(item, tag)))
  if (!query) return free
  const lower = (tag) => tag.toLocaleLowerCase()
  return [
    ...free.filter((tag) => lower(tag).startsWith(query)),
    ...free.filter((tag) => !lower(tag).startsWith(query) && lower(tag).includes(query)),
  ]
}

/** The account a bill goes out of, or null when it has none or the account was removed. */
export function billAccount(bill, accounts) {
  return accounts.find((account) => account.id === bill.accountId) ?? null
}

function totals(bills, view, baseCurrency) {
  const yearly = bills.reduce(
    (total, bill) => total + toBaseMinor(bill.amount, bill.currency, bill.rate, baseCurrency) * timesPerYear(bill.frequency),
    0,
  )
  return { count: bills.length, yearly: Math.round(yearly), perPeriod: Math.round(yearly / timesPerYear(view)) }
}

/**
 * What goes out of each account, per `view` period and per year, in your income currency.
 * Accounts with no bills are listed too; bills with no account come last as `id: null`.
 * @param {import('./models.js').Bill[]} bills
 * @param {Account[]} accounts
 */
export function totalsByAccount(bills, accounts, view, baseCurrency) {
  const rows = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    ...totals(bills.filter((bill) => bill.accountId === account.id), view, baseCurrency),
  }))
  const none = bills.filter((bill) => !billAccount(bill, accounts))
  if (none.length > 0) rows.push({ id: null, name: 'No account', ...totals(none, view, baseCurrency) })
  return rows
}

/**
 * What each tag's bills cost, per `view` period and per year. A bill with two tags counts under
 * both, so these add up to more than your bills. Bills with no tag come last as `tag: null`.
 * @param {import('./models.js').Bill[]} bills
 */
export function totalsByTag(bills, view, baseCurrency) {
  const rows = tagOptions(bills)
    .map(({ tag }) => ({ tag, ...totals(bills.filter((bill) => hasTag(bill, tag)), view, baseCurrency) }))
    .sort((a, b) => b.yearly - a.yearly || a.tag.localeCompare(b.tag))
  const none = bills.filter((bill) => bill.tags.length === 0)
  if (none.length > 0) rows.push({ tag: null, ...totals(none, view, baseCurrency) })
  return rows
}

/** Whether a bill has a tag, ignoring case. */
export function hasTag(bill, tag) {
  return bill.tags.some((item) => sameTag(item, tag))
}
