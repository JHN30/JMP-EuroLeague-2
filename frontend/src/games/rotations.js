import { formatPeriod } from "../lib/format";
import { compareByName, isStarter } from "./gameUtils";

// A reconstructed rotation counts as matching the box score when every player is within this many seconds.
export const RECONCILIATION_TOLERANCE_SECONDS = 30;

const STARTING_FIVE = 5;

// Periods 1 to 4 are 10 minutes; each overtime is 5.
export function periodSeconds(periodNumber) {
  return periodNumber <= 4 ? 600 : 300;
}

function periodStart(periodNumber) {
  let total = 0;
  for (let number = 1; number < periodNumber; number += 1) total += periodSeconds(number);
  return total;
}

// `markerTime` is the time remaining in the period ("MM:SS"), or null for untimed events.
function remainingSeconds(markerTime) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(markerTime ?? "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function elapsedAt(event) {
  const remaining = remainingSeconds(event.markerTime);
  if (remaining === null || !Number.isInteger(event.periodNumber) || event.periodNumber < 1) return null;
  const length = periodSeconds(event.periodNumber);
  return periodStart(event.periodNumber) + length - Math.min(remaining, length);
}

function momentLabel(event) {
  return `${formatPeriod(event.periodNumber)} ${event.markerTime}`;
}

// Joins stints that touch, such as a player who leaves and returns at the same instant.
function mergeStints(stints) {
  const merged = [];
  for (const stint of [...stints].sort((left, right) => left.start - right.start)) {
    const last = merged.at(-1);
    if (last && stint.start <= last.end) {
      if (stint.end > last.end) {
        last.end = stint.end;
        last.endLabel = stint.endLabel;
      }
    } else {
      merged.push({ ...stint });
    }
  }
  return merged;
}

function sideRotations({ players, subEvents, gameSeconds, endLabel, hasUnknownPlayer }) {
  const starters = players.filter(isStarter);
  if (starters.length !== STARTING_FIVE) return { status: "no-starters" };

  const byKey = new Map(players.map((player) => [player.personKey, player]));
  const open = new Map(starters.map((player) => [player.personKey, { start: 0, startLabel: `${formatPeriod(1)} 10:00` }]));
  const stintsByKey = new Map();
  let approximate = hasUnknownPlayer;

  function close(key, end, label) {
    const stint = open.get(key);
    open.delete(key);
    if (end <= stint.start) return;
    const stints = stintsByKey.get(key) ?? [];
    stints.push({ start: stint.start, end, startLabel: stint.startLabel, endLabel: label });
    stintsByKey.set(key, stints);
  }

  for (const event of subEvents) {
    if (!byKey.has(event.personCode)) continue;
    const time = elapsedAt(event);
    if (time === null) {
      approximate = true;
      continue;
    }
    if (event.playType === "OUT") {
      if (open.has(event.personCode)) close(event.personCode, time, momentLabel(event));
      else approximate = true;
    } else if (open.has(event.personCode)) {
      approximate = true;
    } else {
      open.set(event.personCode, { start: time, startLabel: momentLabel(event) });
    }
  }
  for (const key of [...open.keys()]) close(key, gameSeconds, endLabel);

  const rows = [...stintsByKey.entries()].map(([key, stints]) => {
    const merged = mergeStints(stints);
    return { player: byKey.get(key), stints: merged, seconds: merged.reduce((sum, stint) => sum + (stint.end - stint.start), 0) };
  });
  rows.sort(
    (left, right) =>
      Number(isStarter(right.player)) - Number(isStarter(left.player)) ||
      right.seconds - left.seconds ||
      compareByName(left.player, right.player),
  );

  const secondsByKey = new Map(rows.map((row) => [row.player.personKey, row.seconds]));
  let maxDifference = 0;
  for (const player of players) {
    if (!Number.isFinite(player.timePlayed)) continue;
    maxDifference = Math.max(maxDifference, Math.abs((secondsByKey.get(player.personKey) ?? 0) - player.timePlayed));
  }
  maxDifference = Math.round(maxDifference);

  return { status: "ok", rows, maxDifference, matches: !approximate && maxDifference <= RECONCILIATION_TOLERANCE_SECONDS };
}

// Rebuilds who was on the court when from the box-score starters and the substitution events. `playerStats` are both
// teams' box-score rows; `events` are the play-by-play events in order.
export function computeRotations({ events, playerStats }) {
  const subEvents = events.filter((event) => event.playType === "IN" || event.playType === "OUT");
  if (subEvents.length === 0) return { status: "empty" };

  const periodNumbers = events.map((event) => event.periodNumber).filter(Number.isInteger);
  const lastPeriod = Math.max(1, ...periodNumbers);
  const gameSeconds = periodStart(lastPeriod) + periodSeconds(lastPeriod);
  const periods = Array.from({ length: lastPeriod }, (_, index) => ({
    number: index + 1,
    start: periodStart(index + 1),
    length: periodSeconds(index + 1),
  }));
  const endLabel = `${formatPeriod(lastPeriod)} 00:00`;
  const knownKeys = new Set(playerStats.map((player) => player.personKey));
  const hasUnknownPlayer = subEvents.some((event) => !knownKeys.has(event.personCode));

  const forSide = (side) =>
    sideRotations({ players: playerStats.filter((player) => player.side === side), subEvents, gameSeconds, endLabel, hasUnknownPlayer });

  return { status: "ok", gameSeconds, periods, sides: { local: forSide("local"), road: forSide("road") } };
}

const MADE_FIELD_GOALS = { "2FGM": 2, "3FGM": 3 };
const TOP_PAIRS = 5;

// Passer-to-scorer pairs from assist events. An assist is linked only when the event immediately before it is a made
// field goal by the same club and a different player; free throws, fouls, and anything else in between break the link.
// Unlinked assists still count in `recorded`. `clubCodes` maps each side to its club code.
export function computeConnections({ events, clubCodes }) {
  const sides = Object.fromEntries(
    Object.entries(clubCodes).map(([side, clubCode]) => [side, { clubCode, pairs: new Map(), linked: 0, recorded: 0, madeFieldGoals: 0 }]),
  );
  const sideOf = (clubCode) => Object.values(sides).find((side) => side.clubCode === clubCode);

  events.forEach((event, index) => {
    const side = sideOf(event.clubCode);
    if (!side) return;
    if (MADE_FIELD_GOALS[event.playType]) side.madeFieldGoals += 1;
    if (event.playType !== "AS") return;
    side.recorded += 1;

    const shot = events[index - 1];
    const isLinked =
      shot &&
      MADE_FIELD_GOALS[shot.playType] &&
      shot.clubCode === event.clubCode &&
      shot.personCode &&
      event.personCode &&
      shot.personCode !== event.personCode;
    if (!isLinked) return;

    side.linked += 1;
    const key = `${event.personCode}>${shot.personCode}`;
    const pair = side.pairs.get(key) ?? {
      key,
      passer: { personKey: event.personCode, personName: event.playerName },
      scorer: { personKey: shot.personCode, personName: shot.playerName },
      baskets: 0,
      points: 0,
    };
    pair.baskets += 1;
    pair.points += MADE_FIELD_GOALS[shot.playType];
    side.pairs.set(key, pair);
  });

  const nameOf = (person) => person.personName ?? person.personKey;
  const result = {};
  for (const [name, side] of Object.entries(sides)) {
    const pairs = [...side.pairs.values()].sort(
      (left, right) =>
        right.baskets - left.baskets ||
        right.points - left.points ||
        nameOf(left.passer).localeCompare(nameOf(right.passer)) ||
        nameOf(left.scorer).localeCompare(nameOf(right.scorer)),
    );
    result[name] = { pairs: pairs.slice(0, TOP_PAIRS), linked: side.linked, recorded: side.recorded, madeFieldGoals: side.madeFieldGoals };
  }
  return result;
}
