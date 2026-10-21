import { useEffect } from "react";

export const SITE_NAME = "JMP EuroLeague";

const DEFAULT_DESCRIPTION =
  "Standings, games, teams, players, leaders, comparisons and the postseason bracket for EuroLeague seasons 2000-01 to 2026-27.";

// The tab title: "Page name | JMP EuroLeague". Without a name the site name stands alone.
// The optional description is the page's search-result summary; without one the site's own stays.
export function useDocumentTitle(title, description) {
  useEffect(() => {
    document.title = title ? title + " | " + SITE_NAME : SITE_NAME;
  }, [title]);

  useEffect(() => {
    const text = description ?? DEFAULT_DESCRIPTION;
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]']) {
      document.head.querySelector(selector)?.setAttribute("content", text);
    }
  }, [description]);
}
