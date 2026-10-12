import { useQuery } from "@tanstack/react-query";
import { getSeasonFormat } from "./api";

// The season's format and status (stages, data states, issues), shared by every page through the query cache. A page treats a failed
// request as "unknown" and keeps its own wording, so it never blocks on this.
export function useSeasonFormat(seasonCode) {
  return useQuery({
    queryKey: ["season-format", seasonCode],
    queryFn: () => getSeasonFormat(seasonCode),
    enabled: Boolean(seasonCode),
  });
}
