// Court measurements match the guideline's own FIBA half-court renderer
// (restricted-area radius, key half-width/depth, 3PT sideline distance and
// arc radius), all in the same basket-origin unit the source coordinates
// already use. `y <= CORNER_THREE_MAX_Y` is where the straight 3PT sideline
// segment ends and the arc begins (sqrt(675^2 - 660^2)), separating a real
// corner-three cluster from wing/top-of-the-arc threes - the source's own
// `zone` letter is a left/right split, not a corner/wing one, so it isn't
// used here.
const RESTRICTED_AREA_RADIUS = 125;
const KEY_HALF_WIDTH = 245;
const KEY_DEPTH = 580;
const CORNER_THREE_MAX_Y = 145;

export const SHOT_ZONES = ["Restricted area", "Paint", "Mid-range", "Corner three", "Above-break three"];

export function classifyShotZone(coordX, coordY, isThree) {
  if (isThree) {
    return coordY <= CORNER_THREE_MAX_Y ? "Corner three" : "Above-break three";
  }
  const distance = Math.hypot(coordX, coordY);
  if (distance <= RESTRICTED_AREA_RADIUS) return "Restricted area";
  if (Math.abs(coordX) <= KEY_HALF_WIDTH && coordY <= KEY_DEPTH) return "Paint";
  return "Mid-range";
}

export function summarizeZones(shots) {
  return SHOT_ZONES.map((zone) => {
    const zoneShots = shots.filter(
      (shot) => classifyShotZone(Number(shot.coordX), Number(shot.coordY), shot.actionCode.startsWith("3")) === zone,
    );
    const made = zoneShots.filter((shot) => shot.actionCode.endsWith("M")).length;
    return { zone, attempts: zoneShots.length, made };
  });
}
