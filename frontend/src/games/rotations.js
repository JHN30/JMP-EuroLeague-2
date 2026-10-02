import { formatPeriod } from "../lib/format";
import { compareByName, isStarter } from "./gameUtils";

// A rotation counts as matching the box score when every player is within this many seconds of the box-score minutes.
export const RECONCILIATION_TOLERANCE_SECONDS = 30;

// Periods 1 to 4 are 10 minutes; each overtime is 5.
export function periodSeconds(periodNumber) {
  return periodNumber <= 4 ? 600 : 300;
}

function periodStart(periodNumber) {
  let total = 0;
  for (let number = 1; number < periodNumber; number += 1) total += periodSeconds(number);
  return total;
}

// "Q2 10:00": the period an elapsed second falls in and the clock left in it. A stint that ends exactly on a period
// boundary reads as the end of that period ("Q1 00:00"); one that starts on it reads as the start of the next.
function momentLabel(elapsed, { isEnd }) {
  let number = 1;
  while (isEnd ? elapsed > periodStart(number) + periodSeconds(number) : elapsed >= periodStart(number) + periodSeconds(number)) number += 1;
  const remaining = periodStart(number) + periodSeconds(number) - elapsed;
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return `${formatPeriod(number)} ${clock}`;
}

function sideRotations({ intervalsByKey, players }) {
  if (intervalsByKey.size === 0) return { status: "no-intervals" };

  const byKey = new Map(players.map((player) => [player.personKey, player]));
  const rows = [...intervalsByKey.entries()].map(([key, intervals]) => {
    const stints = intervals.map(({ startSeconds, endSeconds }) => ({
      start: startSeconds,
      end: endSeconds,
      startLabel: momentLabel(startSeconds, { isEnd: false }),
      endLabel: momentLabel(endSeconds, { isEnd: true }),
    }));
    return {
      player: byKey.get(key) ?? { personKey: key },
      stints,
      seconds: stints.reduce((sum, stint) => sum + (stint.end - stint.start), 0),
    };
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

  return { status: "ok", rows, maxDifference, matches: maxDifference <= RECONCILIATION_TOLERANCE_SECONDS };
}

// The minutes timeline from the pipeline's on-court intervals (`onCourt`, in elapsed game seconds). `playerStats` are
// both teams' box-score rows: they name the players, say who started and give the minutes to reconcile against.
export function computeRotations({ onCourt, playerStats, gameSeconds }) {
  if (onCourt.length === 0) return { status: "empty" };

  const lastPeriod = (() => {
    let number = 4;
    while (periodStart(number) + periodSeconds(number) < gameSeconds) number += 1;
    return number;
  })();
  const periods = Array.from({ length: lastPeriod }, (_, index) => ({
    number: index + 1,
    start: periodStart(index + 1),
    length: periodSeconds(index + 1),
  }));

  const forSide = (side) =>
    sideRotations({
      intervalsByKey: new Map(onCourt.filter((player) => player.side === side).map((player) => [player.personKey, player.intervals])),
      players: playerStats.filter((player) => player.side === side),
    });

  return { status: "ok", gameSeconds: periodStart(lastPeriod) + periodSeconds(lastPeriod), periods, sides: { local: forSide("local"), road: forSide("road") } };
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
