import { summaryTableStage } from "./seasonFormat";
import { useSeasonFormat } from "./useSeasonFormat";

// The phase code of the table Home and Overview summarise ("RS" until the format says otherwise).
export function useSummaryTableStage(seasonCode) {
  return summaryTableStage(useSeasonFormat(seasonCode).data ?? null);
}
