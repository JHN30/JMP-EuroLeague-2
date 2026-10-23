# Fix: Limit crawlers to the current season

**Type:** Fix
**Status:** verified
**Branch:** fix/limit-crawlers-to-the-current-season

## The problem

Googlebot still crawls all 27 seasons. Search Console's crawl stats jump from near zero to about 11,000 requests a
day on 20-21 October, when Neon started serving seasons 2000-01 to 2026-27, and Cloudflare counted 154k requests in
24 hours, most of them from verified Googlebot addresses (`crawl-192-178-7-*.googlebot.com`).

- Only the current season matters for search. Older seasons stay available to visitors.
- The sitemap cannot limit crawling: it is a hint, and the season picker links every season from every page.
- `frontend/public/robots.txt` (fix `keep-crawlers-off-query-string-page-variants`) blocks query-string page
  addresses but allows every season's plain pages.

## The fix

Only `frontend/public/robots.txt` changes:

```
User-agent: *
Allow: /api/
Disallow: /*?
Disallow: /20
Allow: /2026/
Disallow: /2026/*?

Sitemap: https://www.jmpeuroleague.com/sitemap.xml
```

Google and Bing apply the longest matching rule, with `Allow` winning a tie:

| Address | Result | Deciding rule |
|---|---|---|
| `/2026/home`, `/2026/games/123`, `/2026/players/X`, `/2026/compare` | allowed | `Allow: /2026/` (6) beats `Disallow: /20` (3) |
| `/2025/...` to `/2000/...` | blocked | `Disallow: /20` |
| `/2026/compare?teamA=…`, `/2026/leaders?metric=…` | blocked | `Disallow: /2026/*?` (8) beats `Allow: /2026/` (6) |
| `/api/...` with or without a query string | allowed | `Allow: /api/` (5) beats `Disallow: /*?` (3) |
| `/`, `/assets/...`, `/sitemap.xml`, `/robots.txt` | allowed | no rule matches |

- No page route other than season addresses starts with `/20`, so `Disallow: /20` touches only past seasons.
- `Allow: /api/` stays broad: crawlers only fetch API addresses while rendering pages they may crawl.
- The sitemap stays unchanged; it lists only `/2026/` pages.

Must not break:

- Every `/2026/` page without a query string stays crawlable and renders (its API calls stay allowed).
- Visitors are unaffected: `robots.txt` only instructs crawlers.

Accepted trade-offs:

- Past seasons fade from search results; already indexed ones may show as "Indexed, though blocked by robots.txt"
  for a while.
- `2026` is hard-coded. When the 2027-28 season becomes the default, change it here and in Cloudflare cache rule 2
  and the WAF rule (both outside the repository).

Outside the repository (the user, in Cloudflare): a WAF custom rule blocks known bots from past seasons and from
query-string page addresses at once, without waiting for crawlers to reread `robots.txt`.

Out of scope: a generated sitemap of every 2026 page, a `robots.txt` built from the default season, AI-crawler
sections.

## Build steps

1. [x] Replace the rules in `frontend/public/robots.txt` as above.
   **Done when:** `cd frontend && npm run build` passes, `frontend/dist/robots.txt` matches the new file, and a
   longest-match check of the addresses in the table gives the listed results.

## Verify

- `cd frontend && npm run build` passes; `frontend/dist/robots.txt` matches the new file.
- The longest-match check (scratchpad script) gives the results in the table.
- After deploy (a separate decision):
  - `https://www.jmpeuroleague.com/robots.txt` serves the new rules, and Search Console's robots.txt report shows
    it fetched without errors.
  - URL Inspection, Test live URL: `/2025/home` reports "Blocked by robots.txt"; `/2026/home` is allowed and
    renders its data.
  - Over the following days, Search Console crawl stats and Cloudflare show Googlebot's requests falling.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3640,"specSha256":"97b6f2b033ccdd1c7ced6750c14fc0a2ffd7d2948efe4b1002a8b2212468b08a","branch":"refs/heads/fix/limit-crawlers-to-the-current-season","head":"1507ab605aaf4801be6c93136c9daf21119506f3","baseRef":"refs/heads/master","baseCommit":"1507ab605aaf4801be6c93136c9daf21119506f3","sourceTree":"d4334df654365d8bf314bf4dff00ac733d365f61","absentOptional":[]} -->
