# Budget Helper

A personal budget for recurring bills and income, built as a progressive web app you can install on a phone. Everything stays on the device, except the reminder times and wording sent to your reminder server. The build output is the `docs` folder, ready for GitHub Pages.

## Your budget

Add your income and your bills, each with how often it comes in or goes out: **Weekly**, **Fortnightly**, **Every 4 weeks**, **Monthly**, **Every 2 months**, **Quarterly**, **Every 6 months**, **Yearly**, or **Every…** to pick any number of weeks, months or years.

Everything is turned into a yearly amount: a week is 52 times a year, a fortnight 26, every 4 weeks 13, a month 12. **Your budget** on the home screen then shows **Income**, **Bills** and **Left to spend** per **Week**, **Fortnight**, **4 weeks**, **Month** or **Year**, with the yearly totals underneath. So $10,000 a month is $120,000 a year, and a $500 fortnightly bill is $13,000 a year, or $1,083.33 a month. **4 weeks** and **Month** differ: a year has 13 four-week periods but 12 months, so a $1,000 monthly bill is $923.08 per 4 weeks. Until you pick a period, it uses the one your largest income is paid in.

**Next pay** shows the next date any of your income is paid and how much, the bills that go out before then (a bill on the pay date counts as before it), and, up to the pay after it, the bills that come out of that pay and what it leaves.

**Money in your accounts** estimates what is in all your accounts together each day, as a graph, for the next **30 days**, **3 months**, **6 months** or **Year**. Pay arrives at the start of its date in your timezone and each bill goes out on its date, converted to your income currency; on a pay date the bills are taken off first, as in **Next pay**. Tap **Enter what is in them now** (or **Update**) and type the total in all your accounts, with a minus sign if you are overdrawn. **About now** then starts from that amount and adds the pay and takes off the bills since you entered it, so it stays an estimate until you update it. Until you enter an amount, the graph starts at zero and shows how far your accounts go up or down. Under the graph are the **Lowest** point and where you end up, and **Goes below zero on…** when the estimate drops under zero; the part of the line under zero is drawn in the warning colour. Touch or point at the graph (or use the arrow keys) to read a day's amount and its pay and bills, or open **Show as a list** for every day that has pay or bills.

**Bills by account** shows, once you have listed accounts in **Settings**, what goes out of each account per period and per year, with bills that have no account under **No account**. **Bills by tag** shows what each tag's bills cost; a bill with more than one tag counts under each, so these add up to more than your bills. Tap a row to open **Bills** showing only those bills, or **Open report** for the full summary.

## Report

**Report**, on the **Bills** screen or under **Bills by account** and **Bills by tag**, sums up your bills **By account** or **By tag**, per **Week**, **Fortnight**, **4 weeks**, **Month** or **Year** (the same period as **Your budget**). Each account or tag shows its total for the period and the year, how many bills it has, and its share of all your bills, with a bar against the largest; **No account** or **No tag** comes last, and **All bills** totals them. A bill with more than one tag counts under each, so the tags can add up to more than all bills. Tap an account or tag to open **Bills** showing only those bills. **Download as CSV** saves the summary as a spreadsheet file, with amounts in your income currency.

**Next 30 days** lists every bill that goes out in the next 30 days, at the day and time in your timezone. Tap one to edit it.

The **?** beside the title opens **How it works**, which also appears the first time the app is opened.

## Income

The **INC** button opens **Income**. **Add** takes a name, the amount in your income currency, how often it is paid, and **A date it is paid**, which sets the pattern of pay dates. Tap an income to edit it; **Delete** asks first, and **Undo** on the message that follows brings it back.

## Bills

The **OUT** button opens **Bills**. Each bill shows its amount, how often it goes out, the next time it goes out, and what it costs in a year. Each bill also shows its account and tags. Above the list, the search box finds bills by name, tag, account, how they are paid, notes or currency (every word you type must match, ignoring case and accents). Below it, a button for each frequency your bills use, such as **Monthly** or **Every 4 weeks**, a button for each account (and **No account**), and a button for each tag, each with how many bills it has, show only those bills; tap one again to undo it, or **All** to show every frequency. A line under them counts the bills shown and what they cost in a year, with **Clear** to remove every filter. **Add** takes:

- **Name** and **Amount**.
- **Currency**. When it is not your income currency, **Conversion rate** asks how much 1 unit of the bill's currency is in your income currency, and shows what each payment comes to. Budget figures use that rate. The bill shows the amount in both currencies, and the form says how long ago the rate was set. A rate set more than 90 days ago shows **Check rate** on the list. Budget Helper never looks rates up itself.
- **How often**.
- **Goes out on** and **At**: the first date and the time it goes out, in **Its timezone**, which starts as yours. A monthly bill on the 31st goes out on the last day of shorter months and back on the 31st after them.
- **Last date (optional)**: no payments after it.
- **Remind me before it goes out**, on unless you turn it off.
- **Account**: which of your accounts it goes out of, or **No account**. Until you list accounts in **Settings**, the form links there instead.
- **Tags**, as many as you like up to 12, such as **Work**, **House** or both. Tags you already use are offered under the box, and narrow down as you type; tap one to add it, or tap **+ New tag** (or press Enter) to make a new one. A tag you already use keeps its spelling, so `work` becomes **Work**. Tap a tag on the bill to take it off.
- **Paid by** and **Notes**, both optional. The account and how it is paid appear in its reminder.

Tap a bill to edit it. **Delete** asks first, removes its reminders, and **Undo** brings it back.

## Accounts

**Accounts** in **Settings** lists the accounts your bills go out of, such as Everyday, Joint or Credit card, each with how many bills use it. Type a name and tap **Add**; two accounts cannot share a name. Change a name in its box to rename it everywhere. **Remove** takes the account off its bills, and **Undo** puts it back on them.

## Reminders

Turn reminders on in **Settings**:

- **Your timezone** lists names from New Zealand onward by their offset from GMT, and starts as the timezone on this device.
- **Reminder hour** is when, each day in your timezone, reminders arrive.
- **Send reminders** asks for notification permission, then shows this app's origin, **Reminder server address** and **Reminder server token**. Register that origin as an app on your PWA Push server (`sw-pwa-push`) with `php artisan push-apps:create sw-pwa-budget --origin=…`, and paste its token here.

Each reminder hour is a slot. A bill is reminded in the last slot before it goes out, so a reminder covers the bills going out in the next 24 hours. The bill's own time and timezone are converted to yours: with 9 am reminders in Los Angeles, a bill at 9 am on Thursday in New Zealand (noon on Wednesday in Los Angeles) is reminded at 9 am on Wednesday. When clocks change, a time that is skipped moves forward by the jump and a repeated time is the earlier one.

All the bills in one slot share one notification: one bill gives its name, amount (and the amount in your income currency), when it goes out in your time and its own, and the account it goes out of and how it is paid; several give a count and total, then a line each. The last slot in the 30 days also gets **Keep your bill reminders going**, asking you to open the app.

Budget Helper books 30 days of reminders on the server each time it opens or comes back to the screen, and when you change your timezone or reminder hour; your new timezone is sent to the server too. Saving, deleting or undoing a bill re-books only the reminders that bill falls in. Reminders arrive while the app is closed. One missed by more than 6 hours is skipped. Reminders already sent or skipped stay on the server as a record. **Book reminders now** books straight away, and a line under it says when the next one is due. On iPhone and iPad they need the app added to the Home Screen. Changing the server address or token removes this phone from the old server. Turning **Send reminders** off removes the reminders waiting on the server.

## Your data

Your income, bills, accounts and settings are stored in this browser on this device only, under keys starting with `budget.`.

**Backup to file** saves your income, bills, accounts, the amount you entered in **Money in your accounts**, income currency, reminder hour and budget period to a JSON file. **Restore from file** says what a backup holds and replaces the income, bills and accounts on this phone with it. The timezone and reminder server belong to the device, so they are not in backups.

**Delete all data** removes this phone and every reminder from your reminder server, unsubscribes it from notifications, then clears everything Budget Helper stored here. If the server cannot be reached, it says so and offers **Delete on this phone** instead.

## Install

On iPhone and iPad, tap Share, then Add to Home Screen; on a Mac in Safari, choose File, then Add to Dock. Other browsers offer an **Install** button. The installed app opens full screen and follows the phone's light or dark setting.

## Welcome page

`welcome/index.html` is a short page for people new to the app: what it does, how your data stays on your phone, how to install it, and a link into it. It is published at `https://smurfworks.github.io/sw-pwa-budget/welcome/`.

## Develop

```bash
npm install
npm test
npm run dev -- --port 5175
```

The app is Vue 3 (Composition API, `<script setup>`), Pinia and Tailwind CSS 4, in plain JavaScript, built with Vite and vite-plugin-pwa.

| Path | What it holds |
|---|---|
| `src/lib/frequency.js` | How often: presets, times per year, and the dates something happens on |
| `src/lib/zoned.js` | Dates and times in a named timezone, and changes of clocks |
| `src/lib/money.js` | Amounts in minor units, typing them, formatting, and converting to your income currency |
| `src/lib/models.js` | Bill, income and preference shapes, reading them from storage, next due dates, rate age |
| `src/lib/budget.js` | Yearly and per-period totals, the default period, and **Next pay** |
| `src/lib/forecast.js` | **Money in your accounts**: the day-by-day estimate, its lowest point, and reading the amount you type |
| `src/lib/reminders.js` | Reminder slots, grouping bills into notifications, and **Keep your bill reminders going** |
| `src/lib/push.js` | Registering this phone with the reminder server, booking, re-booking some keys, removing the phone |
| `src/lib/forms.js` | Checking the bill and income forms |
| `src/lib/filters.js` | Searching bills and filtering them by frequency, account and tag |
| `src/lib/groups.js` | Accounts and tags: tidying and checking them, suggesting tags, and totals by account and by tag |
| `src/lib/report.js` | **Report**: totals by account or tag, shares of all bills, and the CSV file |
| `src/lib/backup.js` | Making and reading backup files |
| `src/lib/download.js` | Saving a backup or report file to the phone |
| `src/lib/storage.js` | Storage keys, safe reads and writes, and clearing everything |
| `src/lib/timezone.js`, `src/lib/device.js` | Timezone names ordered from New Zealand, and Safari and iPhone detection |
| `src/stores/` | Pinia stores: `preferences`, `budget`, `reminders`, `data` (backup and delete) and `toast` |
| `src/views/` | Screens: home, bills, bill form, report, income, income form, settings |
| `src/components/` | Parts of screens: budget, next pay, money in your accounts (and its graph) and totals cards, the 30-day list, dialogs, pickers (including tags), the install banner |
| `src/composables/` | Screens sliding over each other (and the back gesture), the install prompt, **How it works** |
| `src/theme.css`, `src/style.css`, `src/welcome.css` | Shared light and dark colours, Tailwind setup and app styles, the welcome page's styles |
| `public/notification-click.js` | Shows a pushed reminder and opens the app when it is tapped |
| `scripts/make-icons.mjs` | Draws the calendar-and-wallet icons (`npm run icons`); `public/favicon.svg` matches them |

Logic lives in `src/lib`, each module with a `*.test.js` beside it. A few component and store tests run in happy-dom; the rest of the screens are checked in a browser.

## Publish on GitHub Pages

`npm install` installs the git hooks. The pre-commit hook runs `npm run build` and stages the `docs` folder, so a commit already contains the site GitHub Pages serves. Coding agents (Claude Code, Codex, Cursor, Gemini) also rebuild `docs` at the end of a turn that edited the app, through `.agents/hooks`.

In the GitHub repo settings, open Pages and deploy from the `main` branch, folder `/docs`.

Asset URLs are relative, so the same build works at `https://<user>.github.io/<repo>/` and at the root of a custom domain.

## Keeping this README current

Every commit that changes how the app behaves updates this README in the same commit. The commit-msg hook refuses a commit that changes the app (anything in `src` other than tests, `index.html`, `public`, or `vite.config.js`) without `README.md`, unless the message has a line reading `README: no change needed`. Coding agents follow the same rule from [AGENTS.md](AGENTS.md).
