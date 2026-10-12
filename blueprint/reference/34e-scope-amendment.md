# Proposed amendment to feature 34e

Status: approved by the user on 2026-10-12 and incorporated into the active spec. Branch, build attempt, archive identity, 18-team format and bracket path stay unchanged.

## Reason

Read-only verification identified Panathinaikos's E2022 two-win deduction. The application tables correctly distinguish 9 credited final-standing wins from 11 played-game wins. The league ruling leaves opponents and individual/team statistics and records unaffected. The approved spec limits API additions to `endedEarly`, so it cannot currently carry this separately scoped disciplinary context.

## Concrete contract addition

Add one variant alongside the approved `endedEarly` variant in the existing format exception union:

```ts
{ kind: "winsDeducted"; clubCode: string; stage: "RS"; roundNumber: number; wins: number; note: string }
```

The only new entry is in E2022: `clubCode: "PAN"`, `stage: "RS"`, `roundNumber: 34`, `wins: 2`. The note is nonempty repository-authored plain text explaining that the final official standings credit two fewer wins while played results and individual/team statistics and records remain unchanged. The positive integer source round identifies the affected final snapshot; the club code remains a season-scoped source identifier. `/format` carries the entry through its existing `exceptions` array. No new endpoint, persisted field or database write is needed.

## Presentation and verification

- Explain the deduction beside the affected final RS standings and on Panathinaikos Team Detail. A Home final-standings summary must also expose the context or link to its explanation. Associate the note with PAN rather than every team's row.
- In race playback/historical standings, apply the explanatory annotation only to RS source round 34. Earlier snapshots remain unannotated and unchanged. Never subtract wins on the client or rewrite official ranks.
- Keep played-result comparisons, form, game logs, individual/team statistics, career and Records eligibility unchanged. Clarify the distinction where a standings record and a played-result record appear together.
- Extend focused tests to prove final standings retain PAN 9-23/17th, played results remain 11-23, earlier snapshots receive no final-round annotation, other seasons/clubs receive no leaked annotation, and statistics/Records retain eligible real results.
- Add the touched standings/Home/team paths to the page, keyboard, loading/error and responsive checks. Preserve the original Madrid-Partizan `endedEarly` work and its tests.

This amendment changes explanatory metadata and UI only. It does not repair or reinterpret data, change qualification rules, introduce sanction accounting or implement E2021 exclusions. After approval, revise the active spec's API contract, affected areas and done-whens to include this entry, then continue `/implement` from step 2.
