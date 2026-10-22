/**
 * The parts of `navigator` that tell Safari, iPhones and the installed app apart.
 * @typedef {{ userAgent: string, maxTouchPoints: number, standalone?: boolean }} BrowserInfo
 */

const OTHER_ENGINES = /chrome|chromium|crios|fxios|edg|android/i

/** @returns {BrowserInfo} */
export function currentBrowser() {
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: /** @type {any} */ (navigator).standalone,
  }
}

function safariEngine(browser) {
  return /safari/i.test(browser.userAgent) && !OTHER_ENGINES.test(browser.userAgent)
}

/** Safari itself, or the iOS Home Screen app, which reports no browser name. */
export function inSafari(browser) {
  return browser.standalone === true || safariEngine(browser)
}

export function installedOnIos(browser) {
  return browser.standalone === true
}

/** An iPhone, iPod or iPad, including an iPad that asks for desktop sites and so reports a Mac. */
export function appleHandheld(browser) {
  if (/iphone|ipad|ipod/i.test(browser.userAgent)) return true
  return safariEngine(browser) && browser.maxTouchPoints > 1
}

export function desktopSafari(browser) {
  return safariEngine(browser) && !appleHandheld(browser)
}

/** Safari has no install prompt, so its users are told where to install from. */
export function installsManually(browser) {
  return appleHandheld(browser) || desktopSafari(browser)
}

export function installCopy(browser) {
  if (appleHandheld(browser)) return 'To install, tap Share, then Add to Home Screen.'
  if (desktopSafari(browser)) return 'To install, choose File, then Add to Dock.'
  return 'Install Budget Helper on your home screen.'
}
