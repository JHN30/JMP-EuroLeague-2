# Fix: Keep crawlers off query-string page variants

**Type:** Fix
**Status:** verified
**Branch:** fix/keep-crawlers-off-query-string-page-variants

## The problem

Search crawlers wake Neon around the clock. Cloudflare's AI Crawl Control (23 October) counts 33.72k crawler
requests, up 10,671% on the previous period:

| Crawler | Requests |
|---|---|
| Googlebot | 31.29k (+47,309%) |
| All AI crawlers together (OpenAI, Anthropic, Perplexity, ByteDance and others) | about 1.4k |

- Google fetched 75.46 MB of JSON. It renders pages like a browser, so every page it opens calls the API, and
  every address nobody has opened in the last 10 minutes misses the server cache and queries Neon.
- The most crawled path is `/2026/compare` (630 requests). Cloudflare lists it without the query string; the
  addresses Google follows carry `?teamA=&teamB=` or `?view=players&playerA=&playerB=`.
- Pages link to these query-string variants from everywhere:

  | Link | From |
  |---|---|
  | `/compare?…` with both clubs | every game (`games/OverviewTab.jsx`), every postseason series (`postseason/MatchupDetail.jsx`) |
  | `/compare?view=players&playerA=…` | every player (`players/PlayerHero.jsx`) |
  | `/compare?teamA=&teamB=` | every team (`teams/TeamQuickCompare.jsx`) |
  | `/compare?view=players&playerA=&playerB=` | team comparisons (`comparisons/CompareTeamOverview.jsx`) |
  | `/compare/head-to-head?teamA=&teamB=` | comparisons (`comparisons/ComparisonsPage.jsx`) |
  | `?metric=` boards | leaders |
  | `?phase=` | postseason links to standings and games |

  Across 27 seasons that gives Google tens of thousands of addresses that show the same pages with different
  filters, each one new to the cache.
- Since 21 October (`4199979`, `8f4aeee`) Neon serves all 27 seasons and the site descriptions say so, which
  multiplied the pages Google can find.
- `frontend/public/robots.txt` allows everything (`User-agent: *`, `Allow: /`).

## The fix

Only `frontend/public/robots.txt` changes:

```
User-agent: *
Allow: /api/
Disallow: /*?

Sitemap: https://www.jmpeuroleague.com/sitemap.xml
```

- `Disallow: /*?` stops crawlers fetching any page address that has a query string. Every page keeps its plain
  address (seasons, standings, games, game pages, teams, team pages, players, player pages, leaders, records,
  compare, postseason), and those stay crawlable.
- `Allow: /api/` is required: the frontend's own API calls use query strings (`scope`, `phase`, `metric`,
  `limit` and others in `frontend/src/lib/api.js`), and Google must still fetch them to render pages. Google
  and Bing apply the longest matching rule, so `/api/` (5 characters) beats `/*?` (3) for API addresses.
- The sitemap line and the sitemap stay unchanged; it lists only plain addresses.

Must not break:

- Plain page addresses and the built assets under `/assets/` stay crawlable.
- Google can still render pages: every API address, with or without a query string, stays allowed.
- Visitors are unaffected: `robots.txt` only instructs crawlers.

Accepted trade-offs:

- Filtered views (`?metric=`, `?phase=`, a chosen comparison) will not appear in search results. Their plain
  pages, which hold the same content behind a control, still can.
- Crawlers that ignore `robots.txt` are not stopped; Cloudflare shows the big volume comes from Googlebot,
  which follows it.
- Google keeps crawling the plain pages, so Neon still wakes for them. Cloudflare edge caching for the API (the
  deferred build-plan item) is the follow-up for that, not part of this fix.

Out of scope: `nofollow` on links, canonical tags, Cloudflare edge caching, blocking AI crawlers, the server
cache (it stays as it is).

## Build steps

1. [x] Replace the rules in `frontend/public/robots.txt` as above.
   **Done when:** `cd frontend && npm run build` passes and `frontend/dist/robots.txt` holds exactly the new rules.

## Verify

- `cd frontend && npm run build` passes; `frontend/dist/robots.txt` matches the new file.
- With the frontend dev server running, `http://localhost:5173/robots.txt` serves the new rules.
- After deploy (a separate decision):
  - Search Console's robots.txt report shows the new file fetched without errors.
  - URL Inspection, Test live URL: `/2026/compare?teamA=…&teamB=…` reports "Blocked by robots.txt", while a
    plain game or player page is allowed, renders its data, and lists no blocked API resources.
  - Over the following days, Cloudflare's AI Crawl Control shows Googlebot's requests falling and `/compare`
    dropping from the most crawled paths; Neon's Monitoring shows more idle periods.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4609,"specSha256":"9ea7c9ddeda8c150490c299410963ff22a1739d1ee9f5ad6affec915d3dee6e9","branch":"refs/heads/fix/keep-crawlers-off-query-string-page-variants","head":"dfca41d31080668bb7a6c074f1dfb6a1529a8f81","baseRef":"refs/heads/master","baseCommit":"dfca41d31080668bb7a6c074f1dfb6a1529a8f81","sourceTree":"c92caeafd56d724b846cd3503a251ef9a66b1054","absentOptional":[]} -->
