import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import { seasonFormat, type FormatException, type SeasonFormat, type StageFormat } from "./season-format-registry";
import { games, postseasonSeries, standings } from "./season-schema";
import { getLatestStandingsRound } from "./season-standings";

const COMPETITION_CODE = "E";

export type SeasonStatus = "notStarted" | "inProgress" | "completed" | "cancelled";
export type StageDataState = "loaded" | "partial" | "upcoming" | "missing";
export type FormatIssue = { code: string; stage: string | null; message: string };

export type FormatStage = Omit<StageFormat, "code"> & {
  code: StageFormat["code"];
  order: number;
  statisticsScopes: string[];
  dataState: StageDataState;
  observed: {
    gamesPlayed: number;
    gamesTotal: number;
    groups: { name: string; clubs: string[] }[];
    clubs: string[];
  };
};

export type SeasonFormatResponse = {
  seasonCode: string;
  family: string;
  status: SeasonStatus;
  plannedClubs: number;
  stages: FormatStage[];
  exceptions: FormatException[];
  issues: FormatIssue[];
};

type GameRow = {
  phaseCode: string | null;
  roundNumber: number | null;
  played: boolean | null;
  gameStatus: string | null;
  localClubCode: string | null;
  roadClubCode: string | null;
};

type StandingRow = { clubCode: string; groupName: string | null; gamesPlayed: number | null };

const sorted = (values: Iterable<string>) => [...values].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
// A game the league cancelled is not owed, so it neither counts against loading nor keeps a stage open.
const owed = (game: GameRow) => game.gameStatus !== "Cancelled";

async function latestStandings(seasonCode: string, phaseCode: string): Promise<StandingRow[]> {
  const round = await getLatestStandingsRound(seasonCode, phaseCode);
  if (round === null) return [];
  return catalogRead(() =>
    db.select({ clubCode: standings.clubCode, groupName: standings.groupName, gamesPlayed: standings.basicGamesPlayed })
      .from(standings)
      .where(and(
        eq(standings.competitionCode, COMPETITION_CODE),
        eq(standings.seasonCode, seasonCode),
        eq(standings.phaseCode, phaseCode),
        eq(standings.roundNumber, round),
      )),
  );
}

function plannedGames(stage: StageFormat): number | null {
  if (stage.type !== "table" || stage.plannedGroups === null || stage.plannedClubsPerGroup === null) return null;
  return stage.plannedGroups * stage.plannedClubsPerGroup * (stage.plannedClubsPerGroup - 1);
}

function seasonStatus(format: SeasonFormat, gameRows: GameRow[]): SeasonStatus {
  if (format.cancelled) return "cancelled";
  if (!gameRows.some((game) => game.played)) return "notStarted";
  const last = format.stages[format.stages.length - 1];
  const lastGames = gameRows.filter((game) => game.phaseCode === last.code && owed(game));
  if (lastGames.length === 0) return "inProgress";
  const lastRound = Math.max(...lastGames.map((game) => game.roundNumber ?? 0));
  return lastGames.filter((game) => (game.roundNumber ?? 0) === lastRound).every((game) => game.played) ? "completed" : "inProgress";
}

// The season's format with what the loaded data shows for each stage, and every place where the two disagree.
export async function getSeasonFormat(seasonCode: string): Promise<SeasonFormatResponse | null> {
  const format = seasonFormat(seasonCode);
  if (!format) return null;

  const [gameRows, seriesRows, ...stageStandings] = await Promise.all([
    catalogRead(() =>
      db.select({
        phaseCode: games.phaseCode,
        roundNumber: games.roundNumber,
        played: games.played,
        gameStatus: games.gameStatus,
        localClubCode: games.localClubCode,
        roadClubCode: games.roadClubCode,
      })
        .from(games)
        .where(and(eq(games.competitionCode, COMPETITION_CODE), eq(games.seasonCode, seasonCode))),
    ),
    catalogRead(() =>
      db.select({ phaseCode: postseasonSeries.phaseCode, gamesPlayed: postseasonSeries.gamesPlayed })
        .from(postseasonSeries)
        .where(and(eq(postseasonSeries.competitionCode, COMPETITION_CODE), eq(postseasonSeries.seasonCode, seasonCode))),
    ),
    ...format.stages.map((stage) => (stage.type === "table" ? latestStandings(seasonCode, stage.code) : Promise.resolve([]))),
  ]);

  const status = seasonStatus(format, gameRows);
  const issues: FormatIssue[] = [];
  const excluded = format.exceptions.flatMap((exception) => (exception.kind === "excludedClubs" ? exception.clubs : []));
  const heldCodes = new Set<string>(format.stages.map((stage) => stage.code));

  for (const phaseCode of sorted(new Set(gameRows.map((game) => game.phaseCode ?? "(none)")))) {
    if (!heldCodes.has(phaseCode)) {
      issues.push({ code: "UNEXPECTED_PHASE", stage: phaseCode, message: `Games exist for ${phaseCode}, which this season's format does not hold.` });
    }
  }

  const seasonClubs = new Set(gameRows.flatMap((game) => [game.localClubCode, game.roadClubCode]).filter((club): club is string => club !== null));
  if (seasonClubs.size > 0 && seasonClubs.size !== format.plannedClubs) {
    issues.push({ code: "CLUB_COUNT", stage: null, message: `${seasonClubs.size} clubs have games; the format plans ${format.plannedClubs}.` });
  }

  const stages = format.stages.map((stage, index): FormatStage => {
    const stageGames = gameRows.filter((game) => game.phaseCode === stage.code);
    const owedGames = stageGames.filter(owed);
    const gamesPlayed = stageGames.filter((game) => game.played).length;
    const laterPlayed = gameRows.some((game) =>
      game.played && format.stages.slice(index + 1).some((later) => later.code === game.phaseCode));
    const past = laterPlayed || status === "completed" || status === "cancelled";
    const planned = plannedGames(stage);
    const complete = owedGames.length > 0 && owedGames.every((game) => game.played) && (planned === null || stageGames.length === planned);

    let dataState: StageDataState;
    if (stageGames.length === 0) dataState = past ? "missing" : "upcoming";
    else if (complete) dataState = "loaded";
    else if (gamesPlayed > 0 || past) dataState = "partial";
    else dataState = "upcoming";

    if (dataState === "missing") {
      issues.push({ code: "STAGE_MISSING", stage: stage.code, message: `${stage.name} should have been played but has no games.` });
    }
    if (planned !== null && stageGames.length > 0 && stageGames.length !== planned) {
      issues.push({ code: "GAME_COUNT", stage: stage.code, message: `${stageGames.length} games are loaded; the format plans ${planned}.` });
    }

    const rows = stageStandings[index];
    const groups = new Map<string, string[]>();
    for (const row of rows) {
      const name = row.groupName ?? "";
      groups.set(name, [...(groups.get(name) ?? []), row.clubCode]);
    }
    if (stage.type === "table" && rows.length > 0) {
      const expectedPerGroup = (stage.plannedClubsPerGroup ?? 0) - (stage.code === "RS" ? excluded.length : 0);
      if (groups.size !== stage.plannedGroups || [...groups.values()].some((clubs) => clubs.length !== expectedPerGroup)) {
        issues.push({
          code: "GROUP_LAYOUT",
          stage: stage.code,
          message: `Standings have ${groups.size} group(s) of ${[...groups.values()].map((clubs) => clubs.length).join("/")} clubs; the format plans ${stage.plannedGroups} of ${expectedPerGroup}.`,
        });
      }
      const overplayed = rows.filter((row) => (row.gamesPlayed ?? 0) > (stage.gamesPerClub ?? 0)).map((row) => row.clubCode);
      if (overplayed.length > 0) {
        issues.push({ code: "TOO_MANY_GAMES", stage: stage.code, message: `${sorted(overplayed).join(", ")} played more than ${stage.gamesPerClub} games.` });
      }
    }

    const maxWins = Math.max(stage.winTarget ?? 0, ...stage.knockoutRounds.map((round) => round.winTarget));
    if (stage.type !== "table") {
      const tooLong = seriesRows.filter((series) => series.phaseCode === stage.code && (series.gamesPlayed ?? 0) > 2 * maxWins - 1);
      if (tooLong.length > 0) {
        issues.push({ code: "SERIES_LENGTH", stage: stage.code, message: `${tooLong.length} tie(s) have more than ${2 * maxWins - 1} games.` });
      }
    }

    const clubs = sorted(new Set(stageGames.flatMap((game) => [game.localClubCode, game.roadClubCode]).filter((club): club is string => club !== null)));
    return {
      ...stage,
      order: index + 1,
      statisticsScopes: stage.type === "table" ? [stage.code] : [stage.code, "PS"],
      dataState,
      observed: {
        gamesPlayed,
        gamesTotal: stageGames.length,
        groups: sorted(groups.keys()).map((name) => ({ name, clubs: sorted(groups.get(name) ?? []) })),
        clubs,
      },
    };
  });

  return {
    seasonCode,
    family: format.family,
    status,
    plannedClubs: format.plannedClubs,
    stages,
    exceptions: format.exceptions,
    issues,
  };
}
