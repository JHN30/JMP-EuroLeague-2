# EuroLeague Historical Competition Formats (2000–2027)

> Implementation reference for JMP EuroLeague. Season codes use the starting calendar year: `E2000` = 2000–01, `E2026` = 2026–27.
>
> **Verification note:** This is a working format guide, not a fully audited historical rulebook. Validate exact qualification criteria, tiebreakers, phase/round identifiers, and any exceptional results against official season records before encoding them as authoritative rules.

## 1. Season-by-season overview

### Group-stage era

| Season | Regular season | Second stage | Postseason |
|---|---|---|---|
| 2000–01 | 24 teams, 4 groups of 6 | None | Best-of-3 knockout rounds; best-of-5 semifinals and final |
| 2001–02 | 32 teams, 4 groups of 8 | Top 16: 4 groups of 4 | Final Four |
| 2002–03 | 24 teams, 3 groups of 8 | Top 16: 4 groups of 4 | Final Four |
| 2003–04 | 24 teams, 3 groups of 8 | Top 16: 4 groups of 4 | Final Four |
| 2004–05 | 24 teams, 3 groups of 8 | Top 16: 4 groups of 4 | Best-of-3 quarterfinals + Final Four |
| 2005–06 | 24 teams, 3 groups of 8 | Top 16: 4 groups of 4 | Best-of-3 quarterfinals + Final Four |
| 2006–07 | 24 teams, 3 groups of 8 | Top 16: 4 groups of 4 | Best-of-3 quarterfinals + Final Four |
| 2007–08 | 24 teams, 3 groups of 8 | Top 16: 4 groups of 4 | Best-of-3 quarterfinals + Final Four |
| 2008–09 | 24 teams, 4 groups of 6 | Top 16: 4 groups of 4 | Best-of-5 quarterfinals + Final Four |
| 2009–10 | 24 teams, 4 groups of 6 | Top 16: 4 groups of 4 | Best-of-5 quarterfinals + Final Four |
| 2010–11 | 24 teams, 4 groups of 6 | Top 16: 4 groups of 4 | Best-of-5 quarterfinals + Final Four |
| 2011–12 | 24 teams, 4 groups of 6 | Top 16: 4 groups of 4 | Best-of-5 quarterfinals + Final Four |
| 2012–13 | 24 teams, 4 groups of 6 | Top 16: 2 groups of 8 | Best-of-5 quarterfinals + Final Four |
| 2013–14 | 24 teams, 4 groups of 6 | Top 16: 2 groups of 8 | Best-of-5 quarterfinals + Final Four |
| 2014–15 | 24 teams, 4 groups of 6 | Top 16: 2 groups of 8 | Best-of-5 quarterfinals + Final Four |
| 2015–16 | 24 teams, 4 groups of 6 | Top 16: 2 groups of 8 | Best-of-5 quarterfinals + Final Four |

**Important transitions:**
- `E2000`: knockout series instead of Top 16/Final Four.
- `E2001`: Top 16 and Final Four introduced.
- `E2002`: regular-season field reduced to 24 teams; three groups of eight. Advancement included the top five in each group plus the best sixth-place team; validate the cross-group comparison rules.
- `E2004`: quarterfinal playoff series added between Top 16 and Final Four.
- `E2008`: regular-season groups become four groups of six; quarterfinals become best-of-five.
- `E2012`: Top 16 becomes two groups of eight, each team playing 14 Top 16 games.

### Single-table era

| Season | Teams | Regular-season games per team | Play-In | Postseason |
|---|---:|---:|---|---|
| 2016–17 | 16 | 30 | No | Top 8 best-of-5 quarterfinals + Final Four |
| 2017–18 | 16 | 30 | No | Top 8 best-of-5 quarterfinals + Final Four |
| 2018–19 | 16 | 30 | No | Top 8 best-of-5 quarterfinals + Final Four |
| 2019–20 | 18 | Incomplete (28–29 played) | No | Season cancelled; no champion |
| 2020–21 | 18 | 34 | No | Top 8 quarterfinals + Final Four |
| 2021–22 | 18 initially | Official totals affected by annulled games | No | Top 8 quarterfinals + Final Four |
| 2022–23 | 18 | 34 | No | Top 8 quarterfinals + Final Four |
| 2023–24 | 18 | 34 | Yes | Top 6 direct + 2 Play-In qualifiers; quarterfinals + Final Four |
| 2024–25 | 18 | 34 | Yes | Top 6 direct + 2 Play-In qualifiers; quarterfinals + Final Four |
| 2025–26 | 20 | 38 | Yes | Top 6 direct + 2 Play-In qualifiers; quarterfinals + Final Four |
| 2026–27 | 20 | 38 scheduled | Yes | Same format planned; season ongoing as of October 2026 |

**Important transitions:**
- `E2016`: one league-wide double round-robin standings table replaces groups and Top 16.
- `E2019`: expansion to 18 teams; season later cancelled due to COVID-19.
- `E2021`: Russian clubs excluded; certain previously played results annulled for official standings.
- `E2023`: Play-In introduced for ranks 7–10.
- `E2025`: expansion to 20 teams and 38 regular-season rounds.

## 2. Competition flow by era

### E2000

`Regular season (4 × 6) → knockout series → semifinals → championship series`

No Top 16 or Final Four. Model the elimination series explicitly, not as modern playoff rounds.

### E2001–E2003

`Regular-season groups → Top 16 (4 × 4) → Final Four`

Top 16 group winners qualify directly for Final Four.

### E2004–E2007

`Regular-season groups → Top 16 (4 × 4) → best-of-3 quarterfinals → Final Four`

### E2008–E2011

`Regular-season groups (4 × 6) → Top 16 (4 × 4) → best-of-5 quarterfinals → Final Four`

### E2012–E2015

`Regular-season groups (4 × 6) → Top 16 (2 × 8) → best-of-5 quarterfinals → Final Four`

The top four from each Top 16 group advance to quarterfinals.

### E2016–E2022

`Single regular-season table → top 8 → best-of-5 quarterfinals → Final Four`

Handle `E2019` cancellation and `E2021` annulled results as explicit exceptions.

### E2023 onward

`Single regular-season table → ranks 1–6 directly qualify; ranks 7–10 play Play-In → eight-team quarterfinals → Final Four`

Play-In: 7 vs 8 (winner gets 7th playoff seed); 9 vs 10 (loser eliminated); loser of 7/8 vs winner of 9/10 (winner gets 8th playoff seed).

## 3. Frontend behavior

| Seasons | Standings page | Fixtures/postseason views |
|---|---|---|
| E2000 | Four separate group tables | Knockout series and championship series |
| E2001–E2003 | RS groups and Top 16 groups | Final Four |
| E2004–E2007 | RS groups and Top 16 groups | Best-of-3 playoffs and Final Four |
| E2008–E2011 | RS groups and Top 16 groups | Best-of-5 playoffs and Final Four |
| E2012–E2015 | RS groups and two Top 16 groups | Best-of-5 playoffs and Final Four |
| E2016–E2022 | One standings table | Playoffs; special cancelled/annulled season handling |
| E2023 onward | One standings table | Play-In, playoffs, Final Four |

A season may need multiple standings selectors: phase and group. A single global table is not sufficient before `E2016`.

## 4. Suggested TypeScript format configuration

```ts
type StageType =
  | "qualification"
  | "regular_season"
  | "top_16"
  | "play_in"
  | "playoffs"
  | "final_four";

type StageConfig = {
  type: StageType;
  groups?: number;
  teamsPerGroup?: number;
  gamesPerTeam?: number;
  advancingPerGroup?: number;
  seriesBestOf?: number;
};

type SeasonFormat = {
  seasonCode: string;
  teamCount: number;
  formatFamily: string;
  stages: StageConfig[];
};

const format2012: SeasonFormat = {
  seasonCode: "E2012",
  teamCount: 24,
  formatFamily: "group_top16_playoffs",
  stages: [
    { type: "regular_season", groups: 4, teamsPerGroup: 6,
      gamesPerTeam: 10, advancingPerGroup: 4 },
    { type: "top_16", groups: 2, teamsPerGroup: 8,
      gamesPerTeam: 14, advancingPerGroup: 4 },
    { type: "playoffs", seriesBestOf: 5 },
    { type: "final_four" },
  ],
};
```

This is an illustrative shape, **not** a complete authoritative season configuration. Extend it for qualification stages, exceptional advancement rules, official tie-breakers, playoff matchups, and annulments.

## 5. Database recommendations (PostgreSQL / Drizzle)

- `seasons`: season code, status, expected teams, format version.
- `stages`: season ID, stage type, sequence/order, official source identifier.
- `groups`: stage ID, group label, optional source identifier.
- `stage_participants`: stage ID, team ID, nullable group ID.
- `games`: stage ID, nullable group ID, official round, team IDs, result, status, standings eligibility.
- `playoff_series`: stage ID, matchup, best-of length, winner, seed mapping.
- `standings_snapshots`: stage/group/round-specific official standings, if provided.
- `format_rules`: stage qualification rules, tie-breaker policy, special exceptions.

**Avoid inferring stage and group solely from round number.** Round identifiers can be different across eras and data endpoints. Keep official source identifiers and normalized internal identifiers separately.

## 6. Historical edge cases

1. **E2000:** Unique knockout series and best-of-five title series; no Final Four.
2. **Early-2000s advancement:** Some formats require comparing positions across groups (e.g. best sixth-place qualifier); do not use a uniform group cutoff.
3. **Qualification stages:** Some seasons had preliminary qualification before the main regular season; distinguish these games from the main competition.
4. **E2019:** Cancelled season; do not infer a champion or completed standings.
5. **E2021:** Store played results separately from whether they count toward official standings after Russian-team exclusions.
6. **Forfeits/disciplinary rulings:** Official standings can diverge from raw game-score calculations.
7. **Tie-breakers:** Head-to-head and other criteria can vary by era; verify historical bylaws instead of applying today's rules retroactively.
8. **Final Four:** Semifinal, third-place, and championship games should be classified separately where applicable.

## 7. Validation checklist for the model implementing this

- [ ] Identify each season's actual stages and groups from source data.
- [ ] Verify each season's team counts, group sizes, advancement rules, and playoff series lengths.
- [ ] Compare official standings against standings reconstructed from game results.
- [ ] Validate historical tie-breakers with season-specific official regulations.
- [ ] Check phase codes and round numbering across API v2/v3/legacy endpoints.
- [ ] Detect cancelled, unplayed, forfeited, annulled, and replayed games.
- [ ] Ensure playoff brackets come from explicit series/matchup data.
- [ ] Preserve modern season behavior while adding historical formats.
- [ ] Add regression tests with representative seasons: E2000, E2002, E2004, E2008, E2012, E2016, E2019, E2021, E2023, E2025.

## 8. Implementation objective

**Build one reusable, configuration-driven competition engine rather than 27 bespoke implementations.** Use normalized stage/group/game/series data and season-specific rule configurations. Keep all historical assertions subject to validation against official records and the actual downloaded EuroLeague datasets.
