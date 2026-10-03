// Filters shared by the season shot charts. Shots carry the minute they were taken in; the first four periods are ten
// minutes each and every overtime is five.
export function periodNumberForMinute(minute) {
  if (minute == null) return 0;
  return minute <= 40 ? Math.ceil(minute / 10) : 4 + Math.ceil((minute - 40) / 5);
}

export const GAME_SEGMENTS = [
  { key: "all", label: "Full game", test: () => true },
  { key: "h1", label: "First half", test: (shot) => periodNumberForMinute(shot.minute) <= 2 },
  { key: "h2", label: "Second half", test: (shot) => periodNumberForMinute(shot.minute) > 2 && periodNumberForMinute(shot.minute) <= 4 },
  { key: "q1", label: "Q1", test: (shot) => periodNumberForMinute(shot.minute) === 1 },
  { key: "q2", label: "Q2", test: (shot) => periodNumberForMinute(shot.minute) === 2 },
  { key: "q3", label: "Q3", test: (shot) => periodNumberForMinute(shot.minute) === 3 },
  { key: "q4", label: "Q4", test: (shot) => periodNumberForMinute(shot.minute) === 4 },
  { key: "ot", label: "Overtime", test: (shot) => periodNumberForMinute(shot.minute) > 4 },
];

export const RESULT_OPTIONS = [
  { key: "all", label: "Makes and misses", test: () => true },
  { key: "made", label: "Made", test: (shot) => shot.actionCode.endsWith("M") },
  { key: "missed", label: "Missed", test: (shot) => shot.actionCode.endsWith("A") },
];
