// FIBA half-court geometry and the 14 shot zones, in the feed's own frame: centimetres from the hoop, +y toward the
// half-court line, +x toward the shooter's right. The classifier and the court drawing both read these constants, so
// the zones cannot drift from the lines on the floor.
export const COURT = {
  halfWidth: 750,
  baselineY: -157.5,
  halfCourtY: 1242.5,
  laneHalfWidth: 245,
  freeThrowY: 422.5,
  freeThrowRadius: 180,
  restrictedRadius: 125,
  restrictedEndY: -37.5,
  threePointRadius: 675,
  threePointSidelineX: 660,
  backboardY: -37.5,
  backboardHalfWidth: 90,
  rimRadius: 22.5,
  centerCircleRadius: 180,
};

// Where the straight three-point segment ends and the arc begins.
export const CORNER_THREE_MAX_Y = Math.sqrt(COURT.threePointRadius ** 2 - COURT.threePointSidelineX ** 2);

// Angles are measured from the baseline direction: under CORNER a shot is in the corner, from CORNER up to WING it is
// on the wing, and from WING to straight on (90) it is central.
export const CORNER_ANGLE = 36;
export const WING_ANGLE = 72;
// 30 ft.
export const DEEP_THREE_DISTANCE = 914;

export const SHOT_ZONES = [
  "Restricted area",
  "In the paint",
  "Left corner mid-range",
  "Left wing mid-range",
  "Central mid-range",
  "Right wing mid-range",
  "Right corner mid-range",
  "Left corner 3",
  "Left wing 3",
  "Top of the key 3",
  "Right wing 3",
  "Right corner 3",
  "Deep 3",
  "Backcourt",
];

// The feed marks a shot without a location as (-1, -1).
export function hasLocation(shot) {
  const x = Number(shot.coordX);
  const y = Number(shot.coordY);
  if (shot.coordX == null || shot.coordY == null || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  return !(x === -1 && y === -1);
}

export const isThreePointer = (shot) => shot.actionCode.startsWith("3");

export function classifyShotZone(coordX, coordY, isThree) {
  if (coordY > COURT.halfCourtY) return "Backcourt";
  const side = coordX < 0 ? "Left" : "Right";
  const distance = Math.hypot(coordX, coordY);
  const angle = (Math.atan2(Math.max(coordY, 0), Math.abs(coordX)) * 180) / Math.PI;

  if (isThree) {
    if (distance >= DEEP_THREE_DISTANCE) return "Deep 3";
    if (coordY <= CORNER_THREE_MAX_Y) return `${side} corner 3`;
    return angle >= WING_ANGLE ? "Top of the key 3" : `${side} wing 3`;
  }
  if (distance <= COURT.restrictedRadius || (coordY < 0 && Math.abs(coordX) <= COURT.restrictedRadius)) return "Restricted area";
  if (Math.abs(coordX) <= COURT.laneHalfWidth && coordY <= COURT.freeThrowY) return "In the paint";
  if (angle < CORNER_ANGLE) return `${side} corner mid-range`;
  return angle < WING_ANGLE ? `${side} wing mid-range` : "Central mid-range";
}

// The zone of a shot, or null when it has no usable location.
export function shotZone(shot) {
  return hasLocation(shot) ? classifyShotZone(Number(shot.coordX), Number(shot.coordY), isThreePointer(shot)) : null;
}

// One row per zone, over the shots that have a location.
export function summarizeZones(shots) {
  const rows = new Map(SHOT_ZONES.map((zone) => [zone, { zone, attempts: 0, made: 0 }]));
  for (const shot of shots) {
    const row = rows.get(shotZone(shot));
    if (!row) continue;
    row.attempts += 1;
    if (shot.actionCode.endsWith("M")) row.made += 1;
  }
  return [...rows.values()];
}

export const countWithoutLocation = (shots) => shots.filter((shot) => !hasLocation(shot)).length;

// The court is drawn landscape: the hoop on the left, the half-court line on the right and the shooter's right
// toward the top of the picture. A quarter turn of the feed's frame.
export function toScreen(coordX, coordY) {
  return { x: coordY, y: -coordX };
}

// Where a shot is drawn: a shot past the half-court line sits on the line, at its own lateral position.
export function plotPosition(coordX, coordY) {
  return toScreen(coordX, Math.min(coordY, COURT.halfCourtY));
}
