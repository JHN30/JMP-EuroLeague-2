# Fix: Cooler dark-theme text (trial)

**Type:** Fix
**Status:** verified
**Branch:** fix/cooler-dark-theme-text

## The problem

Deferred item 4 from the 2026-11-16 theme review. The dark theme's text is a warm cream, `oklch(95% 0.014 90)` for
`--color-base-content` and `--color-neutral-content` (`index.css:15`, `:23`). Every dark surface is a cool blue-slate
(hue 250). Warm text on cool surfaces can look slightly yellowed. A cool near-white may read crisper and more
"broadcast".

**This is a trial.**
- The user will look at it on the dev server and decide.
- If they like it, it goes through `/complete` as usual.
- If not, the branch is deleted without merging, which restores `master` exactly as it is now. Nothing is committed
  before that decision.

## The fix

- In the dark theme block, change `--color-base-content` and `--color-neutral-content` from `oklch(95% 0.014 90)` to a
  cool near-white: `oklch(95% 0.008 250)`. That is the same lightness, so contrast is unchanged, with a slight tint of
  the surfaces' hue instead of the warm one.
- Nothing else changes. Muted text, labels, chart text and tooltips all derive from `base-content`, so they follow
  automatically.

**Must not break:** contrast. Muted text (66%) and `micro-label` (60%) on panels must stay at 4.5:1 or more, so measure
them.

## Build steps

1. [x] **Swap the two tokens.**
   - **Done when:**
     - the dev server shows the cooler text in dark
     - before and after screenshots (Home, a team page and a player page, in dark at 1280px) are saved for comparison
     - the contrast is measured

Result: the user compared warm, trial and a stronger cool tint side by side on a team page, and picked the trial value.
Contrast on panels with it: muted text 7.28:1, `micro-label` 6.22:1.

## Verify

- `cd frontend && npm run build` passes.
- The user compares the screenshots or the live dev server, then decides between merging (`/complete`) and reverting
  (delete the branch).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2017,"specSha256":"fcecb7a6c0323d0de0e8f8467937730526b311c805489d50025cef942a09d74f","branch":"refs/heads/fix/cooler-dark-theme-text","head":"e00e8cac41de42ef7dffb9c815ac85954de8c754","baseRef":"refs/heads/master","baseCommit":"e00e8cac41de42ef7dffb9c815ac85954de8c754","sourceTree":"3c1128159c80b2ca9faf230091088036c3dc1bc6","absentOptional":[]} -->
