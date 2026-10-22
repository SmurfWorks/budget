# Working on Budget Helper

A personal budget for recurring bills and income, installed as a web app on a phone. Read [README.md](README.md) first: it describes what the app does and where the code lives.

## Commands

```bash
npm test        # vitest: the logic modules, plus a few component and store tests
npm run build   # build into docs/
npm run dev     # local server on port 5175 for checking screens in a browser
```

## Before every commit

1. **Update README.md.** If the commit changes anything a person using the app would notice, or changes where code lives, edit the README so it describes the app after this commit, using the names shown on screen. Stage it in the same commit.
2. If nothing in the README needs to change, for example a refactor or a test-only change, add this line to the commit message:

   ```
   README: no change needed
   ```

   The commit-msg hook (`.githooks/commit-msg`) refuses a commit that changes the app without `README.md` or that line.
3. Run `npm test`. The pre-commit hook builds the site and stages `docs/`, so do not edit `docs/` by hand.

## Conventions

- Vue 3 single-file components with `<script setup>`, in plain JavaScript (no TypeScript). JSDoc typedefs describe the data shapes in `src/lib/models.js`.
- Logic goes in a small module under `src/lib/` with a `*.test.js` beside it. Pinia stores in `src/stores/` hold state and call those modules; screens in `src/views/` and parts in `src/components/` only show and wire things together.
- Styling is Tailwind CSS. Colours come from the theme variables in `src/theme.css` (shared with the other apps), exposed to Tailwind in `src/style.css`, so light and dark mode follow automatically. Do not hard-code colours.
- Everything is stored in this browser under keys that start with `budget.`. Read and write through `src/lib/storage.js`, and wrap any other storage use in try/catch.
- Amounts are whole minor units (cents). Bills keep their own currency and a conversion rate into your income currency; income is always in your income currency.
- Wording in the app and the README is plain English in the second person, and uses the labels shown on screen.
- Screen behaviour is checked in a browser at phone width, in light and dark mode.
