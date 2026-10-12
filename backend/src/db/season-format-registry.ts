// Every season's competition format, from the facts verified in feature 34a
// (blueprint/reference/historical-season-inventory.md). A season belongs to one family (its stage sequence) and adds its own
// values (club count, group layout, third-place game, exceptions). A rule the inventory left unverified stays null. The same
// formats apply on Neon and local: the database target only decides which seasons are served.

export type StageCode = "RS" | "TS" | "PI" | "PO" | "FF";
export type StageType = "table" | "knockout" | "playIn" | "finalFour";
export type AdvancedScope = "RS" | "TS" | "all" | "PS";

export type Qualification =
  | { positions: [number, number]; within: "group" | "table"; to: StageCode; kind: "direct" | "playIn" }
  | { bestOfPosition: number; count: number; to: StageCode; criterion: null };

export type StageFormat = {
  code: StageCode;
  type: StageType;
  name: string;
  plannedGroups: number | null;
  plannedClubsPerGroup: number | null;
  // A double round robin inside each group.
  gamesPerClub: number | null;
  // Wins that take a tie; null when it varies inside the stage (then knockoutRounds lists it).
  winTarget: number | null;
  knockoutRounds: { name: string; winTarget: number }[];
  thirdPlaceGame: boolean | null;
  qualification: Qualification[];
};

export type FormatException =
  | { kind: "cancelled"; suspendedOn: string; cancelledOn: string; note: string }
  | { kind: "excludedClubs"; clubs: string[]; decidedOn: string; countedGames: number; note: string }
  | { kind: "walkover"; gameCode: number; note: string }
  | { kind: "replay"; stage: "PO"; clubs: string[]; note: string };

export type FormatFamily =
  | "eliminationSeries"
  | "top16ToFinalFour"
  | "top16Bo3Playoffs"
  | "top16Bo5Playoffs"
  | "top16TwoGroups"
  | "singleTable"
  | "singleTablePlayIn";

export type SeasonFormat = {
  seasonCode: string;
  family: FormatFamily;
  plannedClubs: number;
  cancelled: boolean;
  // The stages actually held, first to last.
  stages: StageFormat[];
  exceptions: FormatException[];
};

const STAGE_ORDER: StageCode[] = ["RS", "TS", "PI", "PO", "FF"];
const STAGE_NAMES: Record<StageCode, string> = {
  RS: "Regular Season",
  TS: "Top 16",
  PI: "Play-In",
  PO: "Playoffs",
  FF: "Final Four",
};

// The stage sequence of each family, as documented for the API and the checker.
export const FORMAT_FAMILIES: Record<FormatFamily, { seasons: string; stages: StageCode[] }> = {
  eliminationSeries: { seasons: "E2000", stages: ["RS", "PO"] },
  top16ToFinalFour: { seasons: "E2001-E2003", stages: ["RS", "TS", "FF"] },
  top16Bo3Playoffs: { seasons: "E2004-E2007", stages: ["RS", "TS", "PO", "FF"] },
  top16Bo5Playoffs: { seasons: "E2008-E2011", stages: ["RS", "TS", "PO", "FF"] },
  top16TwoGroups: { seasons: "E2012-E2015", stages: ["RS", "TS", "PO", "FF"] },
  singleTable: { seasons: "E2016-E2022", stages: ["RS", "PO", "FF"] },
  singleTablePlayIn: { seasons: "E2023-E2026", stages: ["RS", "PI", "PO", "FF"] },
};

const NO_STAGE_VALUES = { knockoutRounds: [], thirdPlaceGame: null, qualification: [] };

function table(code: "RS" | "TS", groups: number, clubsPerGroup: number, qualification: Qualification[]): StageFormat {
  return {
    code,
    type: "table",
    name: STAGE_NAMES[code],
    plannedGroups: groups,
    plannedClubsPerGroup: clubsPerGroup,
    gamesPerClub: 2 * (clubsPerGroup - 1),
    winTarget: null,
    ...NO_STAGE_VALUES,
    qualification,
  };
}

function series(code: "PI" | "PO", winTarget: number): StageFormat {
  return {
    code,
    type: code === "PI" ? "playIn" : "knockout",
    name: STAGE_NAMES[code],
    plannedGroups: null,
    plannedClubsPerGroup: null,
    gamesPerClub: null,
    winTarget,
    ...NO_STAGE_VALUES,
  };
}

function finalFour(thirdPlaceGame: boolean | null): StageFormat {
  return { ...series("PO", 1), code: "FF", type: "finalFour", name: STAGE_NAMES.FF, thirdPlaceGame };
}

const groupRanks = (from: number, to: number, stage: StageCode): Qualification =>
  ({ positions: [from, to], within: "group", to: stage, kind: "direct" });
const tableRanks = (from: number, to: number, stage: StageCode, kind: "direct" | "playIn" = "direct"): Qualification =>
  ({ positions: [from, to], within: "table", to: stage, kind });
// E2002-E2007: the best sixth-placed club across the three groups also reached the Top 16. The comparison rule is unverified.
const bestSixth: Qualification = { bestOfPosition: 6, count: 1, to: "TS", criterion: null };

type SeasonValues = Omit<SeasonFormat, "seasonCode" | "cancelled" | "exceptions"> & {
  cancelled?: boolean;
  exceptions?: FormatException[];
};

function threeGroupsOfEight(next: StageCode, top16Ranks: number, thirdPlaceGame: boolean, family: FormatFamily): SeasonValues {
  return {
    family,
    plannedClubs: 24,
    stages: [
      table("RS", 3, 8, [groupRanks(1, 5, "TS"), bestSixth]),
      table("TS", 4, 4, [groupRanks(1, top16Ranks, next)]),
      ...(next === "PO" ? [series("PO", 2)] : []),
      finalFour(thirdPlaceGame),
    ],
  };
}

function groupsAndTop16(top16Groups: number, top16Clubs: number, top16Ranks: number, family: FormatFamily): SeasonValues {
  return {
    family,
    plannedClubs: 24,
    stages: [
      table("RS", 4, 6, [groupRanks(1, 4, "TS")]),
      table("TS", top16Groups, top16Clubs, [groupRanks(1, top16Ranks, "PO")]),
      series("PO", 3),
      finalFour(true),
    ],
  };
}

function singleTable(clubs: number, values: Partial<SeasonValues> = {}): SeasonValues {
  return {
    family: "singleTable",
    plannedClubs: clubs,
    stages: [table("RS", 1, clubs, [tableRanks(1, 8, "PO")]), series("PO", 3), finalFour(true)],
    ...values,
  };
}

function singleTablePlayIn(clubs: number, thirdPlaceGame: boolean | null): SeasonValues {
  return {
    family: "singleTablePlayIn",
    plannedClubs: clubs,
    stages: [
      table("RS", 1, clubs, [tableRanks(1, 6, "PO"), tableRanks(7, 10, "PI", "playIn")]),
      series("PI", 1),
      series("PO", 3),
      finalFour(thirdPlaceGame),
    ],
  };
}

const walkover = (gameCode: number, note: string): FormatException => ({ kind: "walkover", gameCode, note });

const SEASON_VALUES: Record<string, SeasonValues> = {
  E2000: {
    family: "eliminationSeries",
    plannedClubs: 24,
    stages: [
      table("RS", 4, 6, [groupRanks(1, 4, "PO")]),
      {
        ...series("PO", 2),
        winTarget: null,
        knockoutRounds: [
          { name: "First round", winTarget: 2 },
          { name: "Quarterfinals", winTarget: 2 },
          { name: "Semifinals", winTarget: 3 },
          { name: "Final", winTarget: 3 },
        ],
      },
    ],
    exceptions: [{
      kind: "replay",
      stage: "PO",
      clubs: ["AEK", "BAS"],
      note: "Semifinal game 2, first won by AEK in overtime, was replayed after Tau's appeal.",
    }],
  },
  E2001: {
    family: "top16ToFinalFour",
    plannedClubs: 32,
    stages: [table("RS", 4, 8, [groupRanks(1, 4, "TS")]), table("TS", 4, 4, [groupRanks(1, 1, "FF")]), finalFour(false)],
    exceptions: [walkover(264, "Top 16 game awarded 2-0 to Maccabi after Ulker withdrew; no box score.")],
  },
  E2002: threeGroupsOfEight("FF", 1, true, "top16ToFinalFour"),
  E2003: {
    ...threeGroupsOfEight("FF", 1, true, "top16ToFinalFour"),
    exceptions: [walkover(200, "Top 16 game awarded 20-0 to Maccabi after Pamesa Valencia did not travel; no box score.")],
  },
  E2004: threeGroupsOfEight("PO", 2, true, "top16Bo3Playoffs"),
  E2005: threeGroupsOfEight("PO", 2, true, "top16Bo3Playoffs"),
  E2006: threeGroupsOfEight("PO", 2, true, "top16Bo3Playoffs"),
  E2007: threeGroupsOfEight("PO", 2, true, "top16Bo3Playoffs"),
  E2008: groupsAndTop16(4, 4, 2, "top16Bo5Playoffs"),
  E2009: groupsAndTop16(4, 4, 2, "top16Bo5Playoffs"),
  E2010: groupsAndTop16(4, 4, 2, "top16Bo5Playoffs"),
  E2011: groupsAndTop16(4, 4, 2, "top16Bo5Playoffs"),
  E2012: groupsAndTop16(2, 8, 4, "top16TwoGroups"),
  E2013: groupsAndTop16(2, 8, 4, "top16TwoGroups"),
  E2014: groupsAndTop16(2, 8, 4, "top16TwoGroups"),
  E2015: groupsAndTop16(2, 8, 4, "top16TwoGroups"),
  E2016: singleTable(16),
  E2017: singleTable(16),
  E2018: singleTable(16),
  E2019: singleTable(18, {
    cancelled: true,
    stages: [table("RS", 1, 18, [])],
    exceptions: [{
      kind: "cancelled",
      suspendedOn: "2020-03-12",
      cancelledOn: "2020-05-25",
      note: "Suspended after round 28 because of COVID-19 and cancelled without a champion.",
    }],
  }),
  E2020: singleTable(18),
  E2021: singleTable(18, {
    exceptions: [{
      kind: "excludedClubs",
      clubs: ["CSK", "DYR", "UNK"],
      decidedOn: "2022-03-22",
      countedGames: 28,
      note: "Russian clubs were withdrawn; their regular-season results were removed from the standings.",
    }],
  }),
  E2022: singleTable(18),
  E2023: singleTablePlayIn(18, true),
  E2024: singleTablePlayIn(18, true),
  E2025: singleTablePlayIn(20, false),
  E2026: singleTablePlayIn(20, null),
};

export const SEASON_FORMATS: ReadonlyMap<string, SeasonFormat> = new Map(
  Object.entries(SEASON_VALUES).map(([seasonCode, values]) => [
    seasonCode,
    { seasonCode, cancelled: false, exceptions: [], ...values },
  ]),
);

export class SeasonFormatRegistryError extends Error {
  constructor(message: string) {
    super(`Season format registry: ${message}`);
  }
}

// Fails fast when an entry contradicts itself, so a wrong format never reaches a response.
export function checkSeasonFormats(formats: ReadonlyMap<string, SeasonFormat>): void {
  const fail = (seasonCode: string, message: string) => {
    throw new SeasonFormatRegistryError(`${seasonCode} ${message}`);
  };
  for (let year = 2000; year <= 2026; year += 1) {
    if (!formats.has(`E${year}`)) fail(`E${year}`, "has no format");
  }
  for (const [seasonCode, format] of formats) {
    if (format.seasonCode !== seasonCode) fail(seasonCode, "is stored under another code");
    if (!/^E(200\d|201\d|202[0-6])$/.test(seasonCode)) fail(seasonCode, "is outside E2000-E2026");
    const family = FORMAT_FAMILIES[format.family];
    if (!family) fail(seasonCode, `has unknown family ${format.family}`);
    const codes = format.stages.map((stage) => stage.code);
    const expected = format.cancelled ? family.stages.slice(0, codes.length) : family.stages;
    if (codes.length === 0 || codes.join() !== expected.join()) fail(seasonCode, `stages ${codes.join()} do not match family ${format.family}`);
    if (codes.some((code, index) => index > 0 && STAGE_ORDER.indexOf(code) <= STAGE_ORDER.indexOf(codes[index - 1]))) {
      fail(seasonCode, "stages are out of order");
    }
    if (format.cancelled !== format.exceptions.some((exception) => exception.kind === "cancelled")) {
      fail(seasonCode, "cancelled flag and cancellation exception disagree");
    }
    const first = format.stages[0];
    if (first.type !== "table" || (first.plannedGroups ?? 0) * (first.plannedClubsPerGroup ?? 0) !== format.plannedClubs) {
      fail(seasonCode, "planned clubs do not match the first stage");
    }
    for (const stage of format.stages) {
      if (stage.name !== STAGE_NAMES[stage.code]) fail(seasonCode, `${stage.code} has the wrong name`);
      const isTable = stage.type === "table";
      if (isTable !== (stage.code === "RS" || stage.code === "TS")) fail(seasonCode, `${stage.code} has the wrong type`);
      if (isTable && (!stage.plannedGroups || !stage.plannedClubsPerGroup || stage.gamesPerClub !== 2 * (stage.plannedClubsPerGroup - 1))) {
        fail(seasonCode, `${stage.code} has an invalid group layout`);
      }
      if (!isTable && (stage.plannedGroups !== null || stage.plannedClubsPerGroup !== null || stage.gamesPerClub !== null)) {
        fail(seasonCode, `${stage.code} is not a table stage but has a group layout`);
      }
      if (!isTable && stage.winTarget === null && stage.knockoutRounds.length === 0) fail(seasonCode, `${stage.code} has no win target`);
      if ([stage.winTarget, ...stage.knockoutRounds.map((round) => round.winTarget)].some((target) => target !== null && !(target >= 1 && target <= 4))) {
        fail(seasonCode, `${stage.code} has an invalid win target`);
      }
      if (stage.thirdPlaceGame !== null && stage.code !== "FF") fail(seasonCode, `${stage.code} cannot have a third-place game`);
      for (const rule of stage.qualification) {
        if (STAGE_ORDER.indexOf(rule.to) <= STAGE_ORDER.indexOf(stage.code) || !codes.includes(rule.to)) {
          fail(seasonCode, `${stage.code} qualifies to a stage that does not follow it`);
        }
        if ("positions" in rule && (rule.positions[0] < 1 || rule.positions[0] > rule.positions[1] || rule.positions[1] > (stage.plannedClubsPerGroup ?? 0))) {
          fail(seasonCode, `${stage.code} has invalid qualification ranks`);
        }
      }
    }
  }
}

checkSeasonFormats(SEASON_FORMATS);

export function seasonFormat(seasonCode: string): SeasonFormat | undefined {
  return SEASON_FORMATS.get(seasonCode);
}

// The phases a season held, in order.
export function seasonStageCodes(seasonCode: string): StageCode[] {
  return seasonFormat(seasonCode)?.stages.map((stage) => stage.code) ?? [];
}

// The statistics scopes a season can have: each table stage, every game, and the postseason when one was held.
export function seasonScopes(seasonCode: string): AdvancedScope[] {
  const codes = seasonStageCodes(seasonCode);
  const postseason = codes.some((code) => code === "PI" || code === "PO" || code === "FF");
  return [
    "RS",
    ...(codes.includes("TS") ? ["TS" as const] : []),
    "all",
    ...(postseason ? ["PS" as const] : []),
  ];
}
