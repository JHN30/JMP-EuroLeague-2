# Feature: Theme tokens and surface system

**From build-plan:** feature 15a
**Build attempt:** 1
**Branch:** feature/theme-tokens-and-surface-system
**Status:** verified

## Goal

Re-author both DaisyUI themes in `frontend/src/index.css` on the `UI-UX.md`
guideline's oklch token system, and add the panel/card/interactive-card surface
classes the guideline defines, without breaking any page that already renders
today. This is foundation work: build-plan items 15b-17 build the pages that
will actually consume the new surface classes, so this step's own visible
proof is the recolored app and the new arena background, not a page redesign.

## Design reference

`UI-UX.md` at the repository root, section 2.1 (theme tokens), section 2.2
(shape/elevation/border), and section 2.5 (background treatment). It is a
guideline, not this project's literal spec: its product name, its EuroCup
scope, and anything depending on data this app doesn't hold are irrelevant
here. Where it gives exact numbers, this spec follows them; where it only
describes an effect in prose, this spec derives a concrete number and says so
in Notes for the AI.

## In scope

- Replace every hex color value in both `@plugin "daisyui/theme"` blocks
  (`dark-euroleague`, `light-euroleague`) with the oklch values in this spec's
  Data / contracts section.
- Replace the structural tokens (`--radius-selector`, `--radius-field`,
  `--radius-box`, `--border`, `--depth`, `--noise`) with the guideline's shared
  values, identical in both themes.
- Add three new CSS classes to `index.css`: `.app-panel`, `.app-card`,
  `.app-card-interactive`, per the guideline's surface system, adapted per this
  project's no-backdrop-blur rule (see Notes for the AI).
- Document the guideline's inset-well recipe as a short code comment near the
  new classes (it is a Tailwind utility pattern in the guideline, not a class,
  and this project keeps it that way).
- Replace `.app-shell`'s `background` with the guideline's three-layer arena
  background (two radial glows plus a diagonal hairline grid), rebuilt from
  this project's own theme variables.

## Out of scope

- Migrating any of the 33 existing `className="panel"` (and `.panel-header`,
  `.panel-title`, `.panel-link`) usages across 15 files to the new
  `.app-panel`/`.app-card` classes. Build-plan 15d explicitly extracts the
  shared `Panel` component that every page will adopt; doing a raw classname
  swap now would touch the same 15 files twice for no visible benefit today,
  since `.panel` already reads its colors from the same CSS variables this
  step re-authors and repaints correctly with zero code changes. 15a's build-plan
  line does say to "retire...the current `.panel` class" - this step retires
  its color values (the literal thing being retired) and leaves the class
  itself defined and in use until 15d replaces its 15 call sites in one pass.
- Typography (heading weights, kickers, opacity scale) - build-plan 15b.
- Accessibility/motion (skip link, touch targets, tab strips) - build-plan 15c.
- Shared component extraction (`Panel`, `SummaryGrid`, etc.) - build-plan 15d.
- Renaming the DaisyUI theme identifiers (`dark-euroleague`/`light-euroleague`)
  to the guideline's own names (`euroleague-dark`/`euroleague-light`). Those
  strings are load-bearing in `useThemePreference.js`, `index.html`, and
  anyone's existing `localStorage` value; renaming them is a functional
  refactor with zero visual benefit and does not belong in a token-value
  change. `coding-standards.md` also names these two theme identifiers
  directly as the ones to keep.
- Font family. The guideline uses the system sans stack; this project
  currently loads Inter deliberately. That is a typography decision (15b's
  territory), not a token/surface one.

## Build loop

`workflow.stepReview` is `feature`: build all steps below, then present one
review packet covering all of them. `workflow.checkpointCommits` is
`disabled`: no commits between steps; `/complete` makes the single work
commit after review and approval.

## Build steps

- [x] 1. **Re-author theme tokens.** Replace every color and structural token
  in both `@plugin "daisyui/theme"` blocks in `frontend/src/index.css` with
  the exact values in Data / contracts. Change nothing else in the file at
  this step. Done when: `npm run lint` and `npm run build` pass in
  `frontend/`, and a browser screenshot of the standings page and a game
  detail page in both `dark-euroleague` and `light-euroleague` shows the new
  palette applied with no unreadable text or invisible borders (existing
  `.panel`-based pages repaint automatically since they already read these
  same CSS variables).

- [x] 2. **Add the surface classes.** Add `.app-panel`, `.app-card`, and
  `.app-card-interactive` to `index.css` per Data / contracts, plus the
  inset-well comment. These classes have no consumers yet. Done when:
  `npm run lint` and `npm run build` pass, and applying each class to a
  throwaway element in the browser devtools shows the expected computed
  background, border, radius, and shadow in both themes, with
  `.app-card-interactive` showing the 2px lift, primary-tinted border, and
  deeper shadow on hover, and a visible `outline` on keyboard focus.

- [x] 3. **Rebuild the arena background.** Replace `.app-shell`'s `background`
  declaration with the three-layer version in Data / contracts. Done when:
  `npm run lint` and `npm run build` pass, and a full-page screenshot in both
  themes shows the orange glow top-left, the accent counter-glow top-right,
  and the diagonal hairline grid running the full page height behind the
  existing (still `.panel`-based) content, with no new horizontal scroll and
  no visible performance stutter on scroll.

## Files / areas

- `frontend/src/index.css` - both `@plugin "daisyui/theme"` blocks, the
  `.app-shell` rule; three new rules added near `.app-card-interactive`'s
  natural neighbors (after `.app-shell`, before `.eyebrow`, matching the
  file's existing top-to-bottom order of shell -> primitives -> page-specific
  classes).

Nothing else changes. No JSX, no new files, no dependency changes.

## Data / contracts

Every value below is either **verbatim** from `UI-UX.md` section 2.1, or
**derived** where the guideline only describes an effect in prose (light-theme
semantic colors darkened for contrast, all `-content` pairs, and the
non-guideline `--color-rank-leader` pair this project already has). Derived
values are called out; implement exactly these numbers rather than
re-deriving them.

### `dark-euroleague` (unchanged theme name/flags: `default: true`,
`prefersdark: true`, `color-scheme: dark`)

```
--color-base-100: oklch(14% 0.018 250)              /* verbatim */
--color-base-200: oklch(18% 0.02 250)               /* verbatim */
--color-base-300: oklch(24% 0.024 250)              /* verbatim */
--color-base-content: oklch(95% 0.014 90)           /* verbatim */
--color-primary: oklch(70% 0.22 42)                 /* verbatim */
--color-primary-content: oklch(18% 0.05 42)         /* derived */
--color-secondary: oklch(72% 0.15 210)              /* verbatim */
--color-secondary-content: oklch(18% 0.03 210)      /* derived */
--color-accent: oklch(72% 0.16 166)                 /* verbatim */
--color-accent-content: oklch(18% 0.04 166)         /* derived */
--color-neutral: oklch(22% 0.02 250)                /* derived; unused by any current class but required by the DaisyUI theme schema */
--color-neutral-content: oklch(95% 0.014 90)        /* derived */
--color-info: oklch(72% 0.16 230)                   /* verbatim */
--color-info-content: oklch(18% 0.04 230)           /* derived */
--color-success: oklch(68% 0.17 150)                /* verbatim */
--color-success-content: oklch(16% 0.04 150)        /* derived */
--color-warning: oklch(80% 0.19 78)                 /* verbatim */
--color-warning-content: oklch(20% 0.05 78)         /* derived */
--color-error: oklch(66% 0.2 25)                    /* verbatim */
--color-error-content: oklch(16% 0.05 25)           /* derived */
--color-rank-leader: oklch(84% 0.17 88)             /* derived; gold, not in the guideline, kept for the existing standings rank-1 badge */
--color-rank-leader-content: oklch(22% 0.05 88)     /* derived */

--radius-selector: 0.5rem                           /* verbatim */
--radius-field: 0.375rem                            /* verbatim */
--radius-box: 0.5rem                                /* verbatim */
--size-selector: 0.25rem                            /* verbatim */
--size-field: 0.25rem                                /* verbatim */
--border: 1px                                       /* verbatim */
--depth: 1                                          /* verbatim */
--noise: 0                                          /* verbatim */
```

### `light-euroleague` (unchanged theme name/flags: `color-scheme: light`)

```
--color-base-100: oklch(99% 0.006 250)              /* derived from "99%... lightness"; hue/chroma kept in the dark theme's cool hue-250 family per the guideline's own framing */
--color-base-200: oklch(96% 0.008 250)              /* derived */
--color-base-300: oklch(91% 0.012 250)              /* derived */
--color-base-content: oklch(20% 0.02 250)           /* derived from "content at 20%" */
--color-primary: oklch(56% 0.19 42)                 /* derived; same hue as dark, darkened for AA text contrast on the near-white base */
--color-primary-content: oklch(99% 0.006 250)       /* derived */
--color-secondary: oklch(28% 0.032 250)             /* verbatim - "redefined completely" to near-black navy */
--color-secondary-content: oklch(99% 0.006 250)     /* derived */
--color-accent: oklch(58% 0.16 174)                 /* verbatim hue shift (166->174) and lightness (72%->58%); chroma carried over since the guideline doesn't restate it */
--color-accent-content: oklch(99% 0.006 250)        /* derived */
--color-neutral: oklch(90% 0.01 250)                /* derived; unused, schema completeness */
--color-neutral-content: oklch(20% 0.02 250)        /* derived */
--color-info: oklch(52% 0.14 230)                   /* derived, same hue as dark, darkened */
--color-info-content: oklch(99% 0.006 250)          /* derived */
--color-success: oklch(48% 0.13 150)                /* derived, same hue as dark, darkened */
--color-success-content: oklch(99% 0.006 250)       /* derived */
--color-warning: oklch(55% 0.16 78)                 /* derived, same hue as dark, darkened */
--color-warning-content: oklch(99% 0.006 250)       /* derived */
--color-error: oklch(50% 0.19 25)                   /* derived, same hue as dark, darkened */
--color-error-content: oklch(99% 0.006 250)         /* derived */
--color-rank-leader: oklch(58% 0.15 85)             /* derived */
--color-rank-leader-content: oklch(99% 0.006 250)   /* derived */

--radius-selector: 0.5rem                           /* verbatim, shared */
--radius-field: 0.375rem                            /* verbatim, shared */
--radius-box: 0.5rem                                /* verbatim, shared (was 1rem; guideline's structural tokens are identical in both themes) */
--size-selector: 0.25rem                            /* verbatim, shared */
--size-field: 0.25rem                                /* verbatim, shared */
--border: 1px                                       /* verbatim, shared */
--depth: 1                                          /* verbatim, shared */
--noise: 0                                          /* verbatim, shared */
```

### New surface classes (step 2)

Opaque fill, no `backdrop-blur`, per this project's no-backdrop-blur rule
(`project-plan.md` section 7: blur caused measured performance problems in
the previous interface). The guideline's own `.app-panel` is translucent
plus blurred; this is the one deliberate deviation from it.

```css
.app-panel {
  border-radius: var(--radius-box);
  border: 1px solid var(--color-base-300);
  background-color: var(--color-base-200);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.app-card {
  border-radius: var(--radius-box);
  border: 1px solid var(--color-base-300);
  background-color: var(--color-base-100);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

/* Inset well (guideline section 2.2): a Tailwind utility pattern, not a
   class, used inline wherever a chart or stat block needs to sit inside a
   recessed frame:
     rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3
*/

.app-card-interactive {
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}
.app-card-interactive:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-base-300));
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}
.app-card-interactive:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### `.app-shell` arena background (step 3)

Replaces the current single-glow `background` shorthand. Uses `color-mix(in
srgb, ...)`, matching this file's existing convention elsewhere (`.court-lines`,
`.stat-badge-*`), rather than switching to `in oklch` just for this one rule.

```css
.app-shell {
  min-height: 100vh;
  color: var(--color-base-content);
  background-color: var(--color-base-200);
  background-image:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--color-primary) 24%, transparent), transparent 34rem),
    radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 28rem),
    linear-gradient(135deg, color-mix(in srgb, var(--color-base-content) 7%, transparent) 1px, transparent 1px);
  background-size: auto, auto, 30px 30px;
  background-repeat: no-repeat, no-repeat, repeat;
}
```

## Testing

No test runner is configured (`AGENTS.md` Commands section has no `test`
entry), so per `coding-standards.md` this is UI/styling work verified by build
output and direct browser evidence, not unit tests. For each step:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser evidence: with the dev server already running (or started for this
  check), drive it and capture screenshots in both themes as each step's
  `Done when` describes. Prefer the same no-new-dependency approach used for
  the theme-switcher fix (Chrome via CDP over the already-running dev server)
  over installing a browser-test runner for one feature.
- `cd backend && npm run build` once at the end, to confirm nothing here
  accidentally touched backend code (it shouldn't - this feature has no
  `Files / areas` outside `frontend/src/index.css`).

## Notes for the AI

- Read `frontend/src/index.css` fresh before editing - the theme-switcher fix
  (merged just before this feature) already removed the `.theme-option` rules
  that used to sit near line 122 and 707, so line numbers have shifted.
- `--color-rank-leader`/`--color-rank-leader-content` and `--color-neutral`/
  `--color-neutral-content` are not in the guideline at all. Keep them
  (rank-leader is actively used by `.rank.rank-1` and `.stat-badge-leader`;
  neutral is inert but required by the DaisyUI theme schema) with the derived
  values above - do not drop them or leave them as hex.
- Every existing custom class in `index.css` (`.panel`, `.stat-badge-*`,
  `.rank`, `.form-pill`, `.kpi-chip`, etc.) already reads colors through
  `var(--color-*)`, never a hardcoded hex value, so step 1 alone recolors the
  entire live app with no other file touched. Confirm this holds if any class
  is found to hardcode a hex value during implementation - if one does,
  that's a real (separate) bug, not something to silently fix inside this
  token-only step; flag it instead.
- Depth changes from `0` to `1` in both themes for the first time. DaisyUI 5's
  `--depth` token adds a subtle pseudo-3D effect to its own components
  (buttons, badges, cards it renders). Include a look at buttons and badges
  specifically in the step-1 and step-3 screenshots, since this project has
  never rendered with `--depth: 1` before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":16109,"specSha256":"1a9d9060578ee22d84331840ef8ea187b85566436991549ab3913d5afc51ab58","branch":"refs/heads/feature/theme-tokens-and-surface-system","head":"58c0fe03b83650e75ca9e5a3ba68fc59dde70429","baseRef":"refs/heads/master","baseCommit":"58c0fe03b83650e75ca9e5a3ba68fc59dde70429","sourceTree":"6f834f033b322004f8a142b125eba5cff7e649cc","absentOptional":[]} -->
