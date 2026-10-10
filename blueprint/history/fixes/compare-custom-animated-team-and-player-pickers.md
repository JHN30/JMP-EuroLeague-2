# Fix: Compare custom animated team and player pickers

**Type:** Fix
**Status:** verified
**Branch:** fix/compare-custom-animated-team-and-player-pickers

## The problem

On the Compare landing (`frontend/src/comparisons/ComparisonsPage.jsx`) the Team A and Team B pickers (`TeamPicker`)
are native `<select>`s. Their open list is drawn by the browser, and on phones by the operating system as a full-screen
sheet, so it can be neither animated nor styled to match the site: the user finds it plain on both phones and desktops.
The player pickers (`PlayerPicker`) already use a custom list (a DaisyUI `menu` under the search box), but it appears and
disappears with no animation, shows text only (no photo or crest), and is not a keyboard listbox: arrow keys do nothing,
and screen readers hear a list of buttons, not a combobox.

## The fix

### A shared picker panel

- A small component local to the Compare page (for example `frontend/src/comparisons/PickerPanel.jsx`), used by both
  pickers: a `role="listbox"` list in a panel that opens in the page flow under its trigger (revised after review: an
  overlay hung past the bottom of the "Compare any two teams" card), the trigger's width, `max-h-64` (about six rows) and
  scrolling inside itself, styled with theme tokens (`bg-base-100`, a `base-300` border, `rounded-box`, a soft shadow) so
  it reads well in both themes. The card grows to hold it.
- It opens and closes with motion's `AnimatePresence`, growing from no height with a fade (about 0.22s, `EASE_OUT` from
  `frontend/src/lib/motion.js`). Height is not a transform, so `<MotionConfig reducedMotion="user">` does not stop it;
  the panel makes the change instant for reduced-motion users with `useReducedMotion`.
- Options are `role="option"` rows with `aria-selected`; the keyboard-active row has a highlighted background and is
  scrolled into view (`block: "nearest"`); the current pick shows a check mark and the primary colour.
- An image that fails to load is hidden, as `RevealImage` already does. A crest value holding several URLs joined with
  ";" (a traded player's season row) shows no crest rather than a broken image.

### Team picker

- A button styled like today's select (`select select-bordered select-sm` look, full width) showing the chosen club's
  crest and name, with `ShortLabel` putting the TV code below `sm`; "Select a team" when none is chosen; a chevron that
  turns when open.
- The button is a select-only combobox: `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`,
  `aria-activedescendant`, named by the visible "Team A" or "Team B" label (`aria-labelledby`), so its accessible name is
  unchanged. Focus stays on the button while the list is open.
- The list: "Select a team" first (choosing it clears the pick, as the empty option does today), then every club with its
  crest and full name, in today's order, leaving out the club picked on the other side.
- Keys: Enter, Space, ArrowDown or ArrowUp open the list on the current pick; ArrowDown, ArrowUp, Home and End move;
  Enter or Space chooses and closes; Escape closes without choosing; Tab closes; typing letters jumps to the next club
  whose name starts with them (type-ahead, reset after about half a second). Clicking or tapping a row chooses it; a
  pointer press outside closes the list.

### Player picker

- The search box stays a text input and becomes an editable combobox (`role="combobox"`, `aria-autocomplete="list"`,
  `aria-expanded`, `aria-controls`, `aria-activedescendant`), keeping its "Player A" or "Player B" label as its name.
- Its list uses the shared panel: each row a small round photo, the name (on up to two lines, as now) and the club line
  with its crest (TV code below `sm`, as now). The "Top scorers" heading, "Searching...", "Loading..." and "No players
  match." stay, as non-option rows.
- Keys: ArrowDown and ArrowUp move through the rows, Enter chooses, Escape closes; focusing the box opens the list as
  today; a pointer press outside or leaving the box closes it.
- The chosen player's box ("name" and "Change") is unchanged.

### Must not break

- Picking, the swap button, the URL parameters (`view`, `teamA`, `teamB`, `playerA`, `playerB`, `game`), opening the
  comparison once both are chosen, and the debounced player search all work as today.
- No new dependency; the panel uses the installed `motion`.
- The opened comparison and its tabs are not touched.

## Build steps

- [x] 1. **Shared panel and team picker.** Add the panel component and replace `TeamPicker`'s `<select>` with the
      combobox button and listbox.
      Done when: on phones (320px) and desktop (1280px), clicking Team A opens an animated panel under it with crests and
      names that scrolls inside itself and stays inside the window; choosing a club fills the button (TV code at 320px,
      name at 1280px) and choosing both teams opens the comparison as before; the other side's club is not offered; the
      keyboard path (Enter to open, ArrowDown, type-ahead, Enter to choose, Escape to close) works with focus on the
      button; an outside click closes the list.
- [x] 2. **Player picker.** Move the player list onto the shared panel with photos and crests, and the combobox keys.
      Done when: focusing Player A opens the animated panel of top scorers with photos and crests; typing filters as
      today; ArrowDown and Enter choose a player; Escape and an outside click close the list; both players chosen open
      the comparison as before.
- [x] 3. **Tests and gate.** Update `frontend/e2e/compare.spec.js` (it chooses teams with `selectOption`) to open the
      combobox and choose an option, and add a keyboard test for both pickers; `compare-layout.spec.js` keeps working
      with the new player list (the "Top scorers" list is now a listbox).
      Done when: the specs are updated and lint cleanly; they are not run before 1 November 2026 (Playwright is paused),
      and the final packet says so. Root `npm run build` and `cd frontend && npm run lint` pass.

## Built as

- Revised after the user's review: the first build opened the list as an overlay under its box (fade, slide and scale),
  which hung past the bottom of the "Compare any two teams" card over the page background. The list now opens inside the
  page under its box, growing from no height with a fade, capped at about six rows; the card grows to hold it, and in the
  players view the open list pushes Player B down instead of covering it. Checked at 320px (dark) and 1280px (light): the
  list grew in (49 to 162px caught mid-way, 256px settled), stayed inside its card for Team A and Team B, picking two teams
  still opened the comparison (`teamA=MIL&teamB=DUB`), and nothing scrolled sideways; screenshots checked.
- Also found while checking: the team pickers sit low on the page, so an opened panel ran past the
  bottom of an 800px window. The panel now scrolls itself just far enough into view once its opening animation ends
  (`scrollIntoView` with `block: "nearest"`, smooth unless the user prefers reduced motion), as a native list shows itself.
- When the player list opens, its first row is the active one, so Enter alone picks the top row and ArrowDown moves to the
  second.
- Evidence: single page visits through the Playwright library against the running dev servers, teams at 320px (light) and
  1280px (dark), players at 320px (dark) and 1280px (light). The team panel was mid-fade 0.07s after the click and settled
  by 0.4s; it sits inside the window (x 29-291 at 320px, 49-603 at 1280px) with 21 options and 20 crests; choosing a club
  shows its TV code at 320px and its name at 1280px, keeps focus on the button, and both teams chosen open the comparison
  (`?view=teams&teamA=BES&teamB=ZAL`). Keys: Enter opened on the current pick, two ArrowDowns reached "Armani Olimpia
  Milan", typing "re" jumped to "Real Madrid", Escape closed, End and Enter chose. The club picked for Team A was not offered
  for Team B; an outside click closed the list. The player panel showed 8 rows with 16 images (photo and crest); ArrowDown
  and Enter chose a player; a nonsense search showed "No players match."; two players opened the comparison. No console
  errors and no sideways scroll. After the scroll-into-view change the opened panel ended exactly at the window's bottom
  edge (512-800 of 800px) with the button still in view, at 320 and 1280px. Screenshots of both panels were checked in both
  themes.
- `compare.spec.js` (picking teams through the combobox, and a new keyboard test for both pickers) and
  `compare-layout.spec.js` (the player list is a listbox of options) are updated and lint cleanly but were not run (browser
  tests are paused until 1 November 2026).

## Verify

Playwright browser tests are paused until 1 November 2026 to save Neon network transfer (`CLAUDE.local.md`), so the
updated specs are not run. Evidence comes from single page visits through the Playwright library against the running
dev servers, as in 31k and 31l-i:

- `cd frontend && npm run lint`; root `npm run build`.
- At 320 and 1280px on `/E2026/compare`: open Team A, check the panel's animation (it is mid-transition shortly after
  the click and settled after about 0.2s), its position inside the window, the rows' crests and names, and that Team B's
  pick is missing; choose two teams and confirm the URL and the opened comparison.
- The keyboard paths above, checking `aria-expanded`, `aria-activedescendant` and the focused element.
- On `?view=players`: the panel with photos and crests, ArrowDown and Enter choosing, "No players match." for a nonsense
  search, and two players opening the comparison.
- Screenshots of both open panels at 320px and 1280px, in the light and dark themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9775,"specSha256":"9ba4f8903e50ece1cb56eb61fa7e2354d43130545fc766ffffa7bb3db055adfe","branch":"refs/heads/fix/compare-custom-animated-team-and-player-pickers","head":"aa64c8fedabcdc6f72d8176dd3b1722c4e0c2007","baseRef":"refs/heads/master","baseCommit":"aa64c8fedabcdc6f72d8176dd3b1722c4e0c2007","sourceTree":"82a92892dc47d2bc8bd57437b05856b1c36597f5","absentOptional":[]} -->
