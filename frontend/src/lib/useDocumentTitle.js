import { useEffect } from "react";

export const SITE_NAME = "JMP EuroLeague";

// The tab title: "Page name | JMP EuroLeague". Without a name the site name stands alone.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? title + " | " + SITE_NAME : SITE_NAME;
  }, [title]);
}
