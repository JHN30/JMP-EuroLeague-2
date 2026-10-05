# Fix: page addresses, tab titles and the public files

**Type:** Fix (polish from feedback)
**Status:** verified
**Branch:** master (done from user feedback; not run through `/fix` and `/implement`)

Recorded after the work, ahead of deployment.

## The problem

- The Home page lived at the bare season address (`/E2026`), Leaders and Compare lived at `/statistics` and `/comparisons`, and
  every address carried the season code with its "E" (`/E2026/...`), so the address did not say which page it was and read oddly.
- Tab titles were the bare page name ("Home", "Overview"), and a player's title was the feed's "JONES, CARLIK".
- The public files had not been checked for deployment: the sitemap listed only `/`, which only redirects.

## What changed

- **Page addresses**: Home is `/:season/home` (the season root and the site root lead there), Leaders `/:season/leaders`, Compare
  `/:season/compare` and its head-to-head `/:season/compare/head-to-head`; the others already matched their page (`overview`,
  `standings`, `games`, `teams`, `players`, `postseason`). The old `/statistics`, `/comparisons`, `/comparisons/head-to-head` and
  `/playoffs` addresses redirect to the new ones keeping the query string and hash (`RedirectTo` in `App.jsx`), so shared links still
  work. Every internal link and the navigation use the new addresses.
- **Season in the address**: the address shows the year, `/2026/standings`, not the code `E2026`. The API takes either form
  (`requestedSeason` in `backend/src/routes/seasons.ts` turns `2026` into `E2026`; anything else still has to be a supported
  season). `getSeasons` returns the seasons with the year as their code (`lib/seasonSlug.js`), so the selector, the career view,
  head-to-head and every link use the year. An address with the code (`/E2025/...`) redirects to the year (`SeasonLayout`), and the
  records page converts the code its rows carry. `formatSeasonLabel` accepts a bare year.
- **Titles**: `useDocumentTitle` now sets "Page name | JMP EuroLeague" (and "JMP EuroLeague" alone without a name). Pages: Home,
  Overview, Standings, Games, "Team A vs Team B" for a game, Teams, a club's name, Players, Leaders, Compare, Head-to-head,
  Postseason, Records and "Page not found". A player's title is "Carlik Jones" (`displayName` in `lib/playerName.js`).
- **`index.html`**: the default title "JMP EuroLeague", a description, and Open Graph and Twitter card tags.
- **`public/`**: `sitemap.xml` lists the nine section pages of the 2026 season only (`/2026/home` and so on; the redirecting root is
  left out, and no `lastmod` is given rather than a wrong one); Home, Overview and Standings have priority 1.0 and the others 0.8.
  `site.webmanifest` gains `start_url`, `scope`, `id`, `description` and `lang` and the "JMP EuroLeague" name; `robots.txt` is
  unchanged in content. The unused `Logo.png` (1.5 MB) and `icons.svg` were removed.
- Specs: the existing ones use the new addresses; new `urls-and-titles.spec.js` covers every navigation tab's address and title, the old
  page names, the old season form and the site root, and a player's title.

## Verify

- `cd backend && npm run build`; `cd frontend && npm run lint`, `npm run build`; the full browser suite passes (95 tests).
- `GET /api/seasons/2026` and `/api/seasons/E2026` both return the season; `abcd` and `20266` are refused.
- Titles and final addresses printed for 18 addresses (every page type, a game, a club, a player, a missing page); the selector,
  the season labels, a player's career view and head-to-head checked after the change.

## Known gaps

- The sitemap is a static list of one season: a later season (or older ones, as a per-season sitemap) needs adding.
- The files name `https://www.jmpeuroleague.com`; the plans say `jmpeuroleague.com`. Choose one canonical host and make the other
  redirect to it.
- The static host needs a rewrite of every path to `index.html`, or a direct visit to `/2026/standings` is a 404 (not in the repo;
  to be set up at deployment).
- The head-to-head `from` and `through` query values written with the old code (`from=E2024`) fall back to the full range.
