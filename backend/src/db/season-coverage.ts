import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { CatalogDatabaseError, catalogRead } from "./season-catalog";
import { coverageGames, coverageSeasons } from "./season-schema";

const COMPETITION_CODE = "E";

export type CoverageStatus = "available" | "partial" | "incomplete" | "unavailable" | "notYetApplicable";

export type CoverageItem = {
  key: string;
  label: string;
  status: CoverageStatus;
  availableCount: number;
  applicableCount: number;
};

const COVERAGE_KEYS = [
  "boxScores",
  "periodScores",
  "officialStandings",
  "rosters",
  "playerPhotos",
  "seasonStatistics",
  "shotLocations",
  "playByPlay",
] as const;

const COVERAGE_STATUSES = new Set<CoverageStatus>([
  "available",
  "partial",
  "incomplete",
  "unavailable",
  "notYetApplicable",
]);

function validCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseCoverageItems(value: unknown): CoverageItem[] {
  if (!Array.isArray(value) || value.length !== COVERAGE_KEYS.length) throw new CatalogDatabaseError();
  return value.map((raw, index) => {
    if (typeof raw !== "object" || raw === null) throw new CatalogDatabaseError();
    const item = raw as Record<string, unknown>;
    if (
      item.key !== COVERAGE_KEYS[index]
      || typeof item.label !== "string"
      || !COVERAGE_STATUSES.has(item.status as CoverageStatus)
      || !validCount(item.availableCount)
      || !validCount(item.applicableCount)
    ) {
      throw new CatalogDatabaseError();
    }
    return {
      key: COVERAGE_KEYS[index],
      label: item.label,
      status: item.status as CoverageStatus,
      availableCount: item.availableCount,
      applicableCount: item.applicableCount,
    };
  });
}

export async function getCoverage(seasonCode: string, gameCode?: number) {
  const rows = gameCode === undefined
    ? await catalogRead(() => db.select({ items: coverageSeasons.items })
      .from(coverageSeasons)
      .where(and(
        eq(coverageSeasons.competitionCode, COMPETITION_CODE),
        eq(coverageSeasons.seasonCode, seasonCode),
      ))
      .limit(1))
    : await catalogRead(() => db.select({ items: coverageGames.items })
      .from(coverageGames)
      .where(and(
        eq(coverageGames.competitionCode, COMPETITION_CODE),
        eq(coverageGames.seasonCode, seasonCode),
        eq(coverageGames.gameCode, gameCode),
      ))
      .limit(1));

  const row = rows[0];
  if (!row) throw new CatalogDatabaseError();

  return {
    scope: { seasonCode, gameCode: gameCode ?? null },
    items: parseCoverageItems(row.items),
  };
}
