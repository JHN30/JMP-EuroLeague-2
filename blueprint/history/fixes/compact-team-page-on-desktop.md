# Fix: Compact team page on desktop

**Type:** Fix
**Status:** verified
**Branch:** fix/compact-team-page-on-desktop

## The problem

On a desktop screen the team page (`/:season/teams/:clubCode`) wastes a lot of space, like the game page did before
`compact-game-page-on-desktop`. Measured at 1440×900 for Real Madrid in 2026-27 (full-page heights: Overview 2081px,
Statistics 1029px, Roster 2270px, Shooting 1501px, Advanced 1808px, Games 1578px):

- **Every tab:** the back link, the header card, the section tabs and a stage row take about 420px before any content.
  The header repeats the club's name on a second line ("Real Madrid · ESP") when the short name equals the name, and the
  stage row is a whole row even when it holds a single "Regular Season" tab. Section headings take two lines.
- **Overview:** the snapshot puts position, home, away, played and remaining in a strip of its own; the four team leaders
  are a 2×2 grid (one row only from 2xl) of ~130px cards; each league-profile metric is a label line with a bar under it;
  the quick comparison's rows grow to fill the panel (~90px each) to match the form and fixtures column.
- **Roster:** a third of the squad is full "Has not played yet" cards with grey silhouettes; the coaching staff is four
  large silhouette cards; three cards per row up to 2xl.
- **Games:** every upcoming game and result is a two-line ~66px row; the form strip caps each column at 8rem, so the bars
  stop at about 85% of the width, and the crests sit far below the bars.
- **Shooting:** the court takes about 750px of height (level with the zones and style beside it).
- **Advanced:** a three-line explanation under the ratings chart.

## The fix

Layout changes only, from `lg` (1024px) up unless noted. Below `lg` the layouts, the order of content and every phone
behaviour stay as they are. No data, query or API changes; nothing is removed from the page except the repeated name
line and the shorter Advanced note. Shared components outside `teams/` change only through opt-in props (or modifier
classes) that only the team page passes, as in the game page fix.

1. **Header (every tab).**
   - The line under the name shows the club's short name only when it differs from the name; the country code moves into
     the facts line after the city ("Madrid · ESP · Movistar Arena · realmadrid.com · 25 EuroLeague seasons since
     2000-01"). Without a city the country leads the line; with no facts the line is just the country (absent with no
     country either).
   - `PageHeader` gets an opt-in `compact` prop: from `lg`, less padding, a smaller crest and a smaller margin below. The
     heading element and its text stay the same.
   - The section tabs and the stage tabs share one row from `lg` (section tabs left, stage tabs right, wrapping to a
     second line only when they do not fit). The stage tabs keep their label, role and behaviour; tabs without a stage
     choice (Roster, Advanced) show none, as today.
2. **Compact section headings.** Every `PanelHeader` on the team page passes `compact` (kicker inline before the title,
   one line, smaller gap). The gaps between sections on the Overview go from `gap-6` to `lg:gap-4`.
3. **Overview.**
   - **Snapshot:** from `lg` one row of three parts: the record (with streak, bar and last results), points per game,
     and the five facts (position, home, away, played, remaining) as a compact block, with no separate strip below.
   - **Team leaders:** four in one row from `lg` with a smaller photo and tighter padding (a modifier on the team page's
     own `team-leaders-grid`; Home's leader row is untouched).
   - **League profile:** from `lg` each metric is one line: name, bar, value, rank.
   - **Form, fixtures and comparison:** from `xl` (1280px) Recent form, Upcoming games and Quick comparison are three
     columns in one row; at `lg` they stay two columns (form and fixtures stacked, comparison beside). The comparison's
     rows no longer grow to fill the panel (its `inline` rows are already tight, so `compact`, which only changes the
     stacked layout, is not needed); panels in the row align to the top. Recent form and Upcoming games rows get tighter padding.
4. **Roster.**
   - Players who have not played yet are no longer full cards: under each position's cards, one muted line "Not played
     yet:" followed by each player's number and name as links to their player page. A position whose players have all
     not played shows only that line. The Table view is unchanged.
   - Coaching staff becomes a compact list: one line per coach with name, role and country (the role colour as today),
     several per row from `sm`.
   - Player cards: four per row from `xl` (was `2xl`); long surnames truncate inside the card with the full name in
     `title`, never overflow.
5. **Games.**
   - Upcoming and result rows are one line from `lg`: smaller crest, then "vs/@ Opponent", the round as muted text on
     the same line, and on the right the date and time on one line (upcoming) or the W/L badge and score (results). The
     "Next" and forfeit badges stay.
   - Form strip: from `lg` the columns share the full width (no 8rem cap) when there are 12 or fewer games; the crest and
     round sit closer to the bars (a lower strip area). More than 12 games keep the scrolling strip as today.
6. **Shooting and Advanced.**
   - ~~Opt-in court width for `ShootingBreakdown`~~ dropped during implement: measured at 1440px the court panel already
     ends level with the zones and style beside it (both about 675-1450px), and that height comes from the 13 zone rows
     plus the style rows, so a narrower court would save no height. The Shooting tab only gets the shared heading change.
   - The ratings chart note becomes one sentence: "Per 100 possessions; dashed lines are the season averages, and the
     shaded gap is each round's net rating (green ahead, red behind)."
7. **Statistics:** only the shared heading change.
8. **Equal heights (requested after the first review).**
   - **Overview:** Recent form, Upcoming games and Quick comparison share one height. From `xl` the two lists show up to
     8 games (5 below `xl`) so they match the comparison, and their rows grow a little (never past 3.5rem) to fill the
     rest. At `lg` the stacked form and fixtures end level with the comparison: whichever side is shorter grows.
   - **Games:** Next games and Latest results share one height while neither is expanded, with "Show all" at the foot of
     each panel so the two buttons line up. Once either is expanded, each keeps its own height.

## Build steps

- [x] 1. **Header, tabs row and headings.** `TeamPage.jsx` (description and `ClubFacts`, the two `TabStrip`s in one
  row), `lib/PageHeader.jsx` (`compact`), `compact` on every team-page `PanelHeader` (TeamPage, TeamLeagueProfile,
  TeamQuickCompare, TeamStatisticsSection, TeamShootingSection, TeamAdvancedSection, TeamGamesSection), Overview gaps.
  Done when: lint passes and at 1440px the header, tabs and stage choice take visibly less height on every tab.
- [x] 2. **Overview.** Snapshot row, leaders row, one-line profile rows, the three-column bottom row with compact
  comparison rows (`TeamPage.jsx`, `TeamLeagueProfile.jsx`, `TeamQuickCompare.jsx`, `index.css`).
  Done when: lint passes and the Overview at 1440px is clearly shorter with nothing clipped.
- [x] 3. **Roster.** Not-played line, coaches list, four cards from `xl` (`TeamRosterSection.jsx`, `index.css`).
  Done when: lint passes; unplayed players appear as links in the line, coaches as compact lines.
- [x] 4. **Games, Shooting and Advanced.** One-line game rows and the wider, shorter form strip
  (`TeamGamesSection.jsx`); the shorter ratings note (`TeamAdvancedSection.jsx`).
  Done when: lint passes and the three tabs show the changes at 1440px.
- [x] 5. **Browser checks.** Update and extend the team page's own specs (`team-overview-layout`,
  `team-statistics-roster-layout`, `team-shooting-games-layout`, `team-advanced-layout`, `team-club-details`) plus
  `responsive.spec.js` (it visits the team page): the header line rules (short name only when different, country in the
  facts line), tabs and stage tabs on one row from 1024px, four leaders in one row from 1024px, three bottom columns from
  1280px, one-line profile and game rows, the not-played line and coach lines, and no sideways scroll or
  clipped content at 320, 390, 768, 1024, 1280 and 1440px; phone layouts unchanged.
  Done when: those specs pass against the local database.
- [x] 6. **Equal heights.** The Overview's last row and the Games tab's two columns share one height
  (`TeamPage.jsx`, `TeamQuickCompare.jsx`, `TeamGamesSection.jsx`), with height checks added to `team-overview-layout`
  and `team-shooting-games-layout`.
  Done when: lint passes and those specs plus `responsive.spec.js` pass against the local database.

## Verify

- `npm run build` (root) and `cd frontend && npm run lint` pass.
- Only the specs listed in step 5, after `/api/health` reports `"target":"local"`.
- By hand at 1440px: open a club's page and go through every tab. The header is one compact card with the stage choice on
  the tabs row, the Overview's leaders sit in one row and its bottom row has three panels, the Roster lists unplayed
  players in one line and the coaches as lines, and game rows are one line. At 390px every tab looks as it does today.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9429,"specSha256":"a3f739abf5f5c97493b18cd6a3663e70bcb6566b4dadd5678d147d17e23f1a7b","branch":"refs/heads/fix/compact-team-page-on-desktop","head":"e188c67a2e19146e641ba7c476dd13b874830f3b","baseRef":"refs/heads/master","baseCommit":"e188c67a2e19146e641ba7c476dd13b874830f3b","sourceTree":"5667d44506d5e5aefd1ac00a6b004ea817545949","absentOptional":[]} -->
