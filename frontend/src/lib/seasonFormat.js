// Words for a season's format (GET /seasons/:season/format): stage round labels, stage descriptions and the season's status. Every
// sentence is built from the stage's own values, so the same code describes any season; a value the format leaves null says nothing.

import { seasonSlug } from "./seasonSlug";

const NUMBER_WORDS = { 1: "one", 3: "three", 5: "five", 7: "seven" };

export function competitionNotes(format, seasonCode, { gameCode, phaseCode, roundNumber, clubCode } = {}) {
  if (!format || seasonSlug(format.seasonCode) !== seasonSlug(seasonCode)) return [];
  return (format.exceptions ?? []).filter((entry) => {
    if (entry.kind === "cancelled") return format.status === "cancelled" && (gameCode != null || phaseCode === "RS");
    if (entry.kind === "endedEarly") return gameCode != null && entry.gameCode === Number(gameCode);
    if (entry.kind === "winsDeducted") return entry.stage === phaseCode && entry.roundNumber === roundNumber && (!clubCode || entry.clubCode === clubCode);
    return false;
  }).map((entry) => entry.kind === "cancelled" ? {
    ...entry,
    note: `Season cancelled. ${entry.note} Suspended on ${entry.suspendedOn}; cancelled on ${entry.cancelledOn}. Latest standings show positions at suspension, not a final classification. Historical playback shows the selected played round. Played performances remain in the statistics and records.`,
  } : entry);
}

function ordinal(number) {
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${number}th`;
  return `${number}${{ 1: "st", 2: "nd", 3: "rd" }[number % 10] ?? "th"}`;
}

// "best-of-five" for a stage that takes 3 wins.
function bestOf(winTarget) {
  const games = 2 * winTarget - 1;
  return `best-of-${NUMBER_WORDS[games] ?? games}`;
}

function stageName(format, code) {
  return format?.stages.find((stage) => stage.code === code)?.name ?? code;
}

// "Round 5" in the regular season; "Playoffs · Game 2" elsewhere, so a round number never reads as another regular-season round.
export function stageRoundLabel(stage, roundName) {
  if (!stage || stage.code === "RS") return roundName;
  return roundName ? `${stage.name} · ${roundName}` : stage.name;
}

function qualificationSentence(stage, format) {
  const parts = stage.qualification.map((rule) => {
    const destination = stageName(format, rule.to);
    if ("bestOfPosition" in rule) {
      return `the best ${ordinal(rule.bestOfPosition)}-placed club${rule.count > 1 ? "s" : ""} also reach${rule.count > 1 ? "" : "es"} the ${destination}`;
    }
    const [from, to] = rule.positions;
    const verb = rule.kind === "playIn" ? "go to" : "reach";
    if (rule.within === "group") {
      if (from === 1 && to === 1) return `each group winner reaches the ${destination}`;
      return from === 1 ? `the top ${to} of each group ${verb} the ${destination}` : `${ordinal(from)}-${ordinal(to)} of each group ${verb} the ${destination}`;
    }
    return from === 1 ? `the top ${to} ${verb} the ${destination}` : `${ordinal(from)}-${ordinal(to)} ${verb} the ${destination}`;
  });
  if (parts.length === 0) return null;
  const text = parts.join("; ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export function stageDescription(stage, format) {
  const sentences = [];
  if (stage.type === "table") {
    if (stage.plannedGroups === 1 && stage.plannedClubsPerGroup) {
      sentences.push(format?.status === "cancelled"
        ? `The planned format was ${stage.plannedClubsPerGroup} clubs playing every other club home and away (${stage.gamesPerClub} games per club).`
        : `Each of the ${stage.plannedClubsPerGroup} clubs plays every other club home and away (${stage.gamesPerClub} games).`);
    } else if (stage.plannedGroups && stage.plannedClubsPerGroup) {
      sentences.push(`${stage.plannedGroups} groups of ${stage.plannedClubsPerGroup}; each club plays its group home and away (${stage.gamesPerClub} games).`);
    }
    const qualification = qualificationSentence(stage, format);
    if (qualification) sentences.push(qualification);
  } else if (stage.type === "playIn") {
    sentences.push("Single games decide the last playoff places.");
  } else if (stage.type === "knockout") {
    if (stage.winTarget !== null) {
      const text = bestOf(stage.winTarget);
      sentences.push(`${text.charAt(0).toUpperCase()}${text.slice(1)} series.`);
    } else if (stage.knockoutRounds.length > 0) {
      // Consecutive rounds of the same length read as one clause: "First round and Quarterfinals best-of-three; ...".
      const runs = [];
      for (const round of stage.knockoutRounds) {
        const last = runs.at(-1);
        if (last && last.winTarget === round.winTarget) last.names.push(round.name);
        else runs.push({ winTarget: round.winTarget, names: [round.name] });
      }
      sentences.push(`${runs.map((run) => `${run.names.join(" and ")} ${bestOf(run.winTarget)}`).join("; ")}.`);
    }
  } else if (stage.type === "finalFour") {
    if (stage.thirdPlaceGame === true) sentences.push("Semifinals, a third-place game and the final.");
    else if (stage.thirdPlaceGame === false) sentences.push("Semifinals and the final; no third-place game.");
    else sentences.push("Semifinals and the final.");
  }
  return sentences.join(" ");
}

// What a stage with no games yet shows on the timeline.
export function stagePlaceholder(stage) {
  if (stage.dataState === "missing") return "Games not loaded";
  if (stage.dataState === "upcoming") return "Not played yet";
  return null;
}

// The season's status in one sentence, for when no scheduled game can say where it stands. Null when a scheduled game should (an
// ongoing or not-yet-started season with fixtures), so the caller keeps its round line.
export function seasonStatusText(format, { hasScheduledGame }) {
  if (!format) return null;
  if (format.status === "completed") return "The season has finished.";
  if (format.status === "cancelled") {
    const note = format.exceptions.find((exception) => exception.kind === "cancelled")?.note;
    return note ? `Season cancelled. ${note}` : "Season cancelled.";
  }
  if (hasScheduledGame) return null;
  if (format.status === "notStarted") return "No games scheduled yet.";
  const nextStage = format.stages.find((stage) => stage.dataState === "upcoming");
  return nextStage ? `${nextStage.name} fixtures not published yet.` : "Next games not published yet.";
}

// The current stage: the latest one with a played game, or the first while none is played. None once the season is over.
export function currentStage(format) {
  if (!format || format.status === "completed" || format.status === "cancelled") return null;
  const played = format.stages.filter((stage) => stage.observed.gamesPlayed > 0);
  return played.at(-1) ?? format.stages[0] ?? null;
}

export function hasLoadingIssues(format) {
  return Boolean(format?.issues?.length);
}

export const LOADING_ISSUES_NOTE = "Some of this season's games are not loaded.";

// The qualification lines of one table stage: [{ tier: "postseason" | "playin", from, to }] in official positions. Null when the
// format is not known, the stage is not a table, or its rules are per group or across groups (those seasons' leaves draw them), so a
// page draws no line rather than a guessed one.
export function tableTiers(format, stageCode) {
  if (format?.status === "cancelled") return null;
  const stage = format?.stages.find((entry) => entry.code === stageCode);
  if (!stage || stage.type !== "table" || stage.qualification.length === 0) return null;
  if (!stage.qualification.every((rule) => "positions" in rule && rule.within === "table")) return null;
  return stage.qualification.map((rule) => ({ tier: rule.kind === "playIn" ? "playin" : "postseason", from: rule.positions[0], to: rule.positions[1] }));
}

// A position's tier, "out" below every line, null when there are no lines.
export function tierForPosition(position, tiers) {
  if (position == null || !tiers) return null;
  return tiers.find((entry) => position >= entry.from && position <= entry.to)?.tier ?? "out";
}

// The last position of a tier (6 for the modern direct places), or null when the season has no such tier.
export function tierEnd(tiers, tier) {
  const ends = (tiers ?? []).filter((entry) => entry.tier === tier).map((entry) => entry.to);
  return ends.length > 0 ? Math.max(...ends) : null;
}
