import { formatPeriod } from "../lib/format";
import { periodSeconds, periodStart } from "./rotations";

export function withRunningScore(events) {
  // `pointsA`/`pointsB` are only populated on scoring rows; forward-fill the
  // running score across non-scoring rows for a continuous score column.
  let scoreA = 0;
  let scoreB = 0;
  return events.map((event) => {
    if (event.pointsA != null) scoreA = event.pointsA;
    if (event.pointsB != null) scoreB = event.pointsB;
    return { ...event, runningScoreA: scoreA, runningScoreB: scoreB };
  });
}

const SCORE_VALUE = { "2FGM": 2, "3FGM": 3, FTM: 1 };

export function eventMoment(event) {
  return { periodNumber: event.periodNumber, markerTime: event.markerTime, scoreA: event.runningScoreA, scoreB: event.runningScoreB };
}

export function momentLabel(moment) {
  return `${formatPeriod(moment.periodNumber)} ${moment.markerTime ?? ""} · ${moment.scoreA}-${moment.scoreB}`.trim();
}

// A run is a streak of consecutive scoring plays by one club with no
// scoring play by the other club in between; non-scoring events (fouls,
// rebounds, turnovers) don't break it.
export function computeGameFlow(events, localClubCode, roadClubCode) {
  const scoringEvents = withRunningScore(events).filter((event) => SCORE_VALUE[event.playType]);

  let leadChanges = 0;
  let ties = 0;
  let priorSign = 0;
  let localBiggest = null;
  let roadBiggest = null;

  for (const event of scoringEvents) {
    const margin = event.runningScoreA - event.runningScoreB;
    const sign = margin > 0 ? 1 : margin < 0 ? -1 : 0;
    if (sign === 0) ties += 1;
    if (sign !== 0 && priorSign !== 0 && sign !== priorSign) leadChanges += 1;
    if (sign !== 0) priorSign = sign;
    if (margin > 0 && (!localBiggest || margin > localBiggest.margin)) {
      localBiggest = { margin, moment: eventMoment(event) };
    }
    if (margin < 0 && (!roadBiggest || -margin > roadBiggest.margin)) {
      roadBiggest = { margin: -margin, moment: eventMoment(event) };
    }
  }

  let localRun = null;
  let roadRun = null;
  let currentSide = null;
  let currentPoints = 0;
  let currentStart = null;
  let currentEnd = null;
  function flushRun() {
    if (!currentSide || currentPoints === 0) return;
    const record = { points: currentPoints, startMoment: currentStart, endMoment: currentEnd };
    if (currentSide === "local" && (!localRun || currentPoints > localRun.points)) localRun = record;
    if (currentSide === "road" && (!roadRun || currentPoints > roadRun.points)) roadRun = record;
  }
  for (const event of scoringEvents) {
    const side = event.clubCode === localClubCode ? "local" : event.clubCode === roadClubCode ? "road" : null;
    if (!side) continue;
    if (side !== currentSide) {
      flushRun();
      currentSide = side;
      currentPoints = 0;
      currentStart = eventMoment(event);
    }
    currentPoints += SCORE_VALUE[event.playType];
    currentEnd = eventMoment(event);
  }
  flushRun();

  return { leadChanges, ties, localBiggest, roadBiggest, localRun, roadRun, scoringEvents };
}

// Seconds elapsed in the game at a clock reading ("MM:SS" left in the period), or null without a usable clock.
export function elapsedSeconds(periodNumber, markerTime) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(markerTime ?? "");
  if (!match || !Number.isInteger(periodNumber) || periodNumber < 1) return null;
  const length = periodSeconds(periodNumber);
  return periodStart(periodNumber) + length - Math.min(Number(match[1]) * 60 + Number(match[2]), length);
}

// The home-minus-road margin as a step series over game time: it starts at 0-0 at the tip-off, changes at each scoring
// play and is held to the end of the last period. `event` is the scoring play behind a point (null for the ends).
export function buildMarginSeries(scoringEvents) {
  const lastPeriod = Math.max(1, ...scoringEvents.map((event) => event.periodNumber).filter(Number.isInteger));
  const periods = Array.from({ length: lastPeriod }, (_, index) => ({
    number: index + 1,
    start: periodStart(index + 1),
    end: periodStart(index + 1) + periodSeconds(index + 1),
  }));
  const gameSeconds = periods.at(-1).end;

  const points = [{ x: 0, y: 0, event: null }];
  for (const event of scoringEvents) {
    const previous = points.at(-1);
    const elapsed = elapsedSeconds(event.periodNumber, event.markerTime);
    points.push({ x: Math.max(previous.x, elapsed ?? previous.x), y: event.runningScoreA - event.runningScoreB, event });
  }
  points.push({ x: gameSeconds, y: points.at(-1).y, event: null });
  return { points, periods, gameSeconds };
}
