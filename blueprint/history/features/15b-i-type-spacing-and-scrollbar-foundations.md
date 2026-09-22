# Feature: Type, spacing, and scrollbar foundations

**From build-plan:** feature 15b-i
**Build attempt:** 1
**Branch:** feature/type-spacing-and-scrollbar-foundations
**Status:** verified

## Goal

Add the guideline's global type-system and layout-scale foundations to
`frontend/src/index.css`, on the same CSS-only, no-page-consumes-it-yet shape
as 15a. This is the safe, mechanical slice of the parent item; the remaining
three (heading fixes, kicker adoption, table overflow) are separate build-plan
items because they require touching page JSX and, for the kicker, real
per-section copy decisions this step should not guess at.

## Design reference

`UI-UX.md` at the repository root, section 2.3 (typography) and section 2.4
(spacing and layout grid). Guideline, not literal spec: skip anything tied to
data this app doesn't hold or product naming it uses.

## In scope

- Global `font-variant-numeric: tabular-nums` on `body`, per the guideline
  ("set globally... so all numbers align in columns without per-cell opt-in").
- `scrollbar-gutter: stable` on `html`, per the guideline ("reserves the
  scrollbar track so pages don't shift horizontally when content grows past
  the viewport").
- A new `.micro-label` class matching the guideline's micro-label recipe
  (`text-xs font-black uppercase tracking-[0.08em-0.16em] opacity-60`),
  unconsumed for now - the same "add the primitive, adopt it later" shape as
  15a's `.app-panel`/`.app-card`.
- Refine the existing `.eyebrow` class (this project's kicker, used once today
  on the nav brand) to the guideline's exact kicker recipe: font-weight 900
  (was 800) and font-size `0.75rem`/`text-xs` (was `0.7rem`), matching "heavy
  display weights... almost everywhere."
- Document, as code comments, the guideline's spacing scale (page gutter,
  container max-width, panel padding, grid gap) and the three-step opacity
  hierarchy (60/65/70) as Tailwind utility recipes for future work to adopt -
  the same treatment 15a gave the inset-well pattern, since there is no shared
  page-wrapper or `Panel` component yet to enforce these structurally
  (build-plan 15d).

## Out of scope

- The two confirmed heading-hierarchy bugs (home dashboard has no `<h1>`;
  Playoffs has no `<h2>`) - build-plan 15b-ii.
- Applying the section kicker to any actual page or panel heading - 15b-iii.
  This needs real per-section kicker copy, which is a content decision this
  step should not invent 15+ times.
- Table overflow discipline (`min-w-0`, truncation, sticky first column) -
  15b-iv.
- Bumping page/section heading `<h1>`/`<h2>`/`<h3>` font-weight or size in
  JSX to the guideline's font-black scale. This is mechanical (a uniform
  className swap across ~10 files) but it is page-level adoption, not a
  foundation, and wasn't part of what was approved for this sub-item. Flagging
  it here as a real, still-open piece of "heavy display weights" for you to
  fold into 15b-ii (already touching heading JSX) or track separately.
- Reclassifying the existing `.muted` class's 66% dimming into the guideline's
  three-step scale. `.muted` has many current call sites and deciding which
  tier each one belongs to is a per-usage judgment call, not a foundation
  change; this step only documents the target scale for that later work.
- Removing the six existing per-class `font-variant-numeric: tabular-nums`
  declarations that become redundant once it's set globally on `body`. Harmless
  duplication, not required by the guideline's contract; cleanup only if
  convenient later.

## Build loop

`workflow.stepReview` is `feature`: build all steps below, then present one
review packet. `workflow.checkpointCommits` is `disabled`: no commits between
steps; `/complete` makes the single work commit after review and approval.

## Build steps

- [x] 1. **Global tabular numerals and stable scrollbar gutter.** Add
  `font-variant-numeric: tabular-nums;` to the existing `body` rule in
  `frontend/src/index.css`, and add a new `html { scrollbar-gutter: stable; }`
  rule near it. Done when: `npm run lint` and `npm run build` pass in
  `frontend/`, and in the browser, `getComputedStyle(document.body)
  .fontVariantNumeric` reports `tabular-nums` and `getComputedStyle(document
  .documentElement).scrollbarGutter` reports `stable` on any page.

- [x] 2. **Add `.micro-label` and refine `.eyebrow`.** Add the new
  `.micro-label` class per Data / contracts. Update `.eyebrow`'s
  `font-weight` to `900` and `font-size` to `0.75rem`. Done when: `npm run
  lint` and `npm run build` pass, applying `.micro-label` to a throwaway
  element in devtools shows the expected computed font-size/weight/
  letter-spacing/color, and the nav bar's existing "EuroLeague" kicker (the
  only current `.eyebrow` consumer) visibly renders heavier with no layout
  break (screenshot both themes).

- [x] 3. **Document the spacing and opacity conventions.** Add the two code
  comments from Data / contracts (spacing scale; three-step opacity
  hierarchy) near the relevant existing rules (`.app-panel`/`.app-card` for
  spacing, `.muted` for opacity). No new CSS rules in this step, comments
  only. Done when: `npm run lint` and `npm run build` pass (a no-op check for
  a comment-only change, but confirms nothing else in the file was disturbed).

## Files / areas

- `frontend/src/index.css` only: the `body` rule, a new `html` rule, the
  `.eyebrow` rule (currently lines 141-147), a new `.micro-label` rule near it,
  and two new comment blocks (near `.app-panel`/`.app-card` and near `.muted`,
  currently lines 108-120 and 149-151 - re-read the file fresh before editing,
  since exact line numbers shift as earlier steps land).

Nothing else changes. No JSX, no new files, no dependency changes.

## Data / contracts

### `body` / `html` (step 1)

```css
body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
```

```css
html {
  scrollbar-gutter: stable;
}
```

### `.micro-label` (step 2, new)

```css
.micro-label {
  font-size: 0.75rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--color-base-content) 60%, transparent);
}
```

`0.1em` tracking is a single representative value inside the guideline's
stated `0.08em-0.16em` range, since this class has no consumer yet to tune it
against. A future adopter can override `letter-spacing` per instance if a
specific use wants the tighter or looser end of that range.

### `.eyebrow` (step 2, refined)

```css
.eyebrow {
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
```

Only `font-size` (`0.7rem` -> `0.75rem`) and `font-weight` (`800` -> `900`)
change; `color`, `letter-spacing`, and `text-transform` are already correct.

### Spacing scale comment (step 3, near `.app-panel`/`.app-card`)

```css
/* Shared spacing scale (UI-UX.md section 2.4), documented for future pages
   and the shared Panel component (build-plan 15d) to adopt - not yet
   enforced anywhere in code:
     Page gutter:  px-3 py-3 -> sm:px-5 sm:py-5 -> lg:px-8 lg:py-6
     Container:    mx-auto w-full max-w-7xl min-w-0 flex-col gap-6
     Panel padding: p-4 sm:p-5 (p-3 on compact cards)
     Grid gaps:    gap-2 (tiles) / gap-3 (cards) / gap-4-5 (within sections)
                   / gap-6 (between page sections)
*/
```

### Opacity hierarchy comment (step 3, near `.muted`)

```css
/* Three-step opacity hierarchy (UI-UX.md section 2.3): 60 for micro-labels
   (see .micro-label), 65 for secondary text, 70 for body copy. The floor of
   60 clears 4.5:1 contrast against the panel fill; nothing but decorative
   marks should go lower. Tailwind ships opacity-60 and opacity-70 directly;
   use the arbitrary-value opacity-[65%] for the middle tier. .muted (66%,
   below) predates this scale and keeps its current call sites; reclassifying
   them into these three tiers is a per-usage decision for later work, not a
   foundation change.
*/
```

## Testing

No test runner is configured, so per `coding-standards.md` this is CSS
foundation work verified by build output and direct browser evidence:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser evidence for each step's `Done when`, using the same no-new-
  dependency approach as prior CSS work (Chrome via CDP over the running dev
  server): computed-style checks for the new/changed rules, plus a screenshot
  of the nav bar's kicker in both themes for step 2.
- `cd backend && npm run build` once at the end, to confirm nothing here
  touched backend code (it shouldn't - `Files / areas` is `index.css` only).

## Notes for the AI

- Read `frontend/src/index.css` fresh before editing - both the theme-switcher
  fix and 15a already changed this file, so line numbers in this spec are
  approximate anchors, not guarantees.
- Do not add a `@theme` block or any Tailwind config customization to make
  `opacity-65` a real utility class. No consumer needs it yet (this step is
  foundations only), and the comment already documents the arbitrary-value
  workaround (`opacity-[65%]`) that needs no config. Add that only if a later
  step's real usage makes a named utility clearly worth it.
- `--weight-display: 900` already exists in `:root` and is already consumed
  by four display-value classes (`.stat-callout .value`, `.kpi-chip .value`,
  `.leader-value`, `.leader-trend-stat .value` or similar - confirm at
  implementation time). That already matches the guideline's heavy-weight
  rule; nothing to change there.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9569,"specSha256":"45a69b101d07fe345b4f647598942c33ed310cdea9f0d59a39b0c6b981fe1fe6","branch":"refs/heads/feature/type-spacing-and-scrollbar-foundations","head":"67e692055b07ee3c6c88da80b7b8c8460517c35b","baseRef":"refs/heads/master","baseCommit":"67e692055b07ee3c6c88da80b7b8c8460517c35b","sourceTree":"7763eeb11a1647406ea68c572dd468d409f613f4","absentOptional":[]} -->
