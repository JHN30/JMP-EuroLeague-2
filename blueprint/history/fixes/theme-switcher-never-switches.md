# Fix: Theme switcher never switches

**Type:** Fix
**Status:** verified
**Branch:** fix/theme-switcher

## The problem

Two related defects: the theme cannot be switched at all, and the one Chart.js
chart in the app would not follow the theme even if it could.

### Part 1: the switcher

The app ships two DaisyUI themes, `dark-euroleague` and `light-euroleague`, but
`light-euroleague` is unreachable. There is no control to switch themes, and the
resolution logic that does exist actively destroys the correct answer.

`frontend/index.html` is correct. Its pre-hydration inline script resolves the
theme in the right order (stored choice, then `prefers-color-scheme`, then the
dark default) and writes it to `<html data-theme>` before React mounts, which is
what prevents a flash of the wrong theme.

`frontend/src/App.jsx` then undoes that work:

- `initialTheme()` (lines 20-23) reads the attribute the inline script just set,
  then gates it behind `Object.hasOwn(theme)`. `Object.hasOwn` takes two
  arguments. Called with one, it evaluates
  `Object.hasOwn("light-euroleague", undefined)`, which looks for an own
  property named `"undefined"` on a `String` wrapper and returns `false`. The
  guard can never pass, so the function always returns `"dark-euroleague"`.
- `useThemeSync()` holds that value in `useState` and destructures only the
  getter, so nothing in the tree can ever change it. The hook also returns
  nothing, so no component receives the value or a setter.
- Its effect writes `"dark-euroleague"` back onto `<html data-theme>`,
  overwriting the inline script's correct resolution, and then persists it to
  `localStorage` under `euroleague-theme`. Persisting on every resolve rather
  than only on an explicit choice is what makes the bug permanent: after one
  page load the stored value is `"dark-euroleague"`, so even a repaired resolver
  would read a poisoned preference and the system setting would never win again.

Two smaller problems sit alongside it:

- The `.theme-option[aria-pressed="true"]` rule in `frontend/src/index.css`
  (line 122, plus its transition at line 707) styles a control that is not
  rendered anywhere. It is dead CSS.
- The effect sets `<meta name="theme-color">` from two hex literals
  (`#151517`, `#f6f2ec`) hardcoded in JavaScript. These duplicate the
  `--color-base-200` token of each theme and will drift from it. The
  `document.querySelector(...)` call is also unguarded and would throw if the
  meta tag were ever removed.

Nothing here is theme-specific to one page: the attribute lives on `<html>`, so
the whole document, the page scrollbar, and the overscroll area are affected.

### Part 2: the chart that will not follow the theme

`frontend/src/comparisons/TrendChart.jsx` is the only Chart.js instance in the
app. Every other chart is hand-rolled SVG styled by CSS classes, so those
re-theme on their own. This one does not, for three reasons:

- It reads `--color-primary`, `--color-accent`, and `--color-base-content`
  through `getComputedStyle` once, inside an effect keyed on `[labels, series]`
  (lines 13-52). A theme change does not touch those dependencies, so the chart
  keeps the previous theme's colours until its data happens to change. This is
  invisible today only because the theme can never change; repairing part 1
  exposes it, which is why it belongs in this fix rather than a separate one.
- That same effect re-runs on **every** render. `ComparisonsPage.jsx` builds
  both props as fresh literals on each render (`labels` at line 619, the
  `series` array at lines 625-628), so their identity always changes, and the
  chart is destroyed and reconstructed each time rather than updated.
- The gridline colour is built by string-concatenating a hex alpha suffix onto a
  token value: `` `${textColor}33` `` (lines 40-41). This works only because our
  themes currently compile to hex. Build-plan item 15a re-authors both themes in
  oklch, at which point the expression becomes `oklch(...)33`, an invalid colour
  that will fail silently. Repairing it now, while the file is open, avoids
  shipping a hidden trap into 15a.

## The fix

Replace the broken resolution with a real preference hook, and render the
control it was missing. This is the root-cause repair: the defect is in the
resolution and persistence logic itself, so no new abstraction, dependency, or
configuration surface is needed.

Add `frontend/src/lib/useThemePreference.js`, exporting a `THEMES` constant
(each theme's DaisyUI `name`, a human `title` for labels and tooltips, and a
`browserColor` for `<meta name="theme-color">`) and a `useThemePreference()`
hook that:

- Resolves an explicit stored choice first, then `prefers-color-scheme`, then
  the dark default, matching what `index.html` already does so the two cannot
  disagree and cause a flash.
- Persists **only** on an explicit toggle. Resolving a theme must never write to
  storage, which is the specific defect that pins every viewer to dark.
- Subscribes to the `prefers-color-scheme` media query so a system change
  applies live while no explicit choice is stored, and stops following once the
  viewer picks one.
- Writes `data-theme` and `color-scheme` onto `document.documentElement` and
  keeps `<meta name="theme-color">` in sync from `browserColor`, guarding the
  lookup so a missing meta tag cannot throw.
- Wraps storage access in `try/catch`, leaving the document attribute
  authoritative when storage is unavailable, as in a private window.
- Returns `{ theme, nextTheme, toggleTheme }`.

Delete `useThemeSync`, `initialTheme`, and the module-level `THEME_KEY` from
`App.jsx`. Keep the storage key string `euroleague-theme` unchanged so viewers
who already have a stored value are not reset; a stored `"dark-euroleague"` from
the bug is a valid explicit choice and simply means they start in dark and can
now toggle out of it.

Render the toggle in the shell header in `frontend/src/season/SeasonLayout.jsx`,
next to `SeasonSelector`. It shows the icon of the theme it will switch **to**
(sun for light, moon for dark) as an inline stroked SVG, carries
`aria-label="Switch to <next theme title>"` and a `title` naming both the
current and next theme, and uses the existing DaisyUI button classes so it
inherits visible focus. Remove the now-obsolete `.theme-option` rules from
`index.css` if the control does not use them.

Must not break: no flash of the wrong theme on first paint (the inline script
stays); season selection, navigation, and routing are untouched; and both themes
must remain usable, since `light-euroleague` has never actually been rendered in
the running app.

## Build steps

- [x] 1. **Resolve and apply the theme correctly.** Add
   `frontend/src/lib/useThemePreference.js` with `THEMES` and
   `useThemePreference()` as described, and call it from `App.jsx` in place of
   `useThemeSync`. Done when the app honours the operating system's light
   setting on a fresh load with no stored choice, a live system theme change
   flips the app without a reload, and loading the app no longer writes to
   `localStorage`.

- [x] 2. **Render the toggle.** Add the theme toggle button to the `SeasonLayout`
   header beside the season selector, wired to `toggleTheme` with the
   next-theme icon, `aria-label`, and `title`. Remove the dead `.theme-option`
   rules from `index.css`. Done when clicking the control flips the theme, the
   choice survives a reload, and the stored choice then wins over the operating
   system setting.

- [x] 3. **Make the Chart.js trend chart follow the theme.** In `TrendChart.jsx`, read
   the theme tokens inside an effect that also depends on the active theme, so a
   switch re-reads them; stabilise the `labels` and `series` props at the
   `ComparisonsPage` call site with `useMemo` so the chart is no longer torn
   down and rebuilt on every render; and replace the
   `` `${textColor}33` `` gridline colour with a `color-mix(in srgb, ...)`
   expression that stays valid whether the token compiles to hex or oklch. Done
   when toggling the theme with the comparisons trend chart on screen repaints
   its lines, ticks, grid, and legend to the new theme without a reload, and
   interacting with the page no longer reconstructs the chart.

## Verify

Run `cd frontend && npm run dev`, then in the browser:

- With `localStorage.removeItem("euroleague-theme")` and the OS set to light,
  reload: the app renders `light-euroleague` with no dark flash on first paint.
- With the app open and no stored choice, switch the OS between light and dark:
  the app follows immediately, without a reload.
- Click the toggle: the theme flips, and the button's icon, `aria-label`, and
  tooltip now name the opposite theme.
- Reload after toggling: the chosen theme persists, and changing the OS setting
  no longer overrides it.
- Inspect `<html>`: it carries both `data-theme` and `color-scheme`, and
  `<meta name="theme-color">` matches the active theme's `base-200`.
- Tab to the toggle: it is keyboard reachable with a visible focus ring, and a
  screen reader announces the theme it will switch to.
- Open the comparisons page, pick two teams so the points-per-round trend chart
  renders, then toggle the theme: the chart's lines, ticks, gridlines, and
  legend all repaint without a reload.
- Spot-check standings, a game detail page, and the statistics leaderboard in
  `light-euroleague` for unreadable text or invisible borders, since that theme
  has never been exercised. Record anything found; contrast repairs beyond the
  switcher belong to build-plan item 15a, not to this fix.
- Run `cd frontend && npm run lint` and `cd frontend && npm run build`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9667,"specSha256":"2155e82e0895d1d74fcababc26b537a9f50f07edef199897c3b5dc16302ed6a0","branch":"refs/heads/fix/theme-switcher","head":"7ea65381132dbbc45faee9e8d586ac7a248436a2","baseRef":"refs/heads/master","baseCommit":"7ea65381132dbbc45faee9e8d586ac7a248436a2","sourceTree":"82fb1d6064f24a53f203b77945ec03d35738832d","absentOptional":[]} -->
