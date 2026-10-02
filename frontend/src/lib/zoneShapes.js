import { CORNER_ANGLE, CORNER_THREE_MAX_Y, COURT, DEEP_THREE_DISTANCE, WING_ANGLE } from "./shotZones";

// The 13 on-court zones as closed regions that tile the half court, in the feed's frame (hoop at the origin, +y toward
// the half-court line), built from the same constants as the classifier. Backcourt has no area on the court and is
// drawn by the court component as a strip outside the half-court line.
const { halfWidth, baselineY, halfCourtY, laneHalfWidth, freeThrowY, restrictedRadius, threePointRadius, threePointSidelineX } = COURT;

const rad = (degrees) => (degrees * Math.PI) / 180;
const onRay = (degrees, radius) => [radius * Math.cos(rad(degrees)), radius * Math.sin(rad(degrees))];
const mirrorPoint = ([x, y]) => [-x, y];

const laneAtCorner = [laneHalfWidth, laneHalfWidth * Math.tan(rad(CORNER_ANGLE))];
const arcAtCorner = onRay(CORNER_ANGLE, threePointRadius);
const arcAtWing = onRay(WING_ANGLE, threePointRadius);
const laneTopAtWing = [freeThrowY / Math.tan(rad(WING_ANGLE)), freeThrowY];
const deepAtWing = onRay(WING_ANGLE, DEEP_THREE_DISTANCE);
const deepAtSideline = [halfWidth, Math.sqrt(DEEP_THREE_DISTANCE ** 2 - halfWidth ** 2)];
const arcStart = [threePointSidelineX, CORNER_THREE_MAX_Y];

// A segment is ["M", point], ["L", point] or ["A", radius, sweep, point]; every arc here is under half a turn and
// sweep 1 runs toward larger angles from the hoop (from +x toward -x).
function path(segments, mirror = false) {
  const flip = (point) => (mirror ? mirrorPoint(point) : point);
  return `${segments
    .map(([kind, ...rest]) => {
      if (kind === "A") {
        const [radius, sweep, point] = rest;
        const [x, y] = flip(point);
        return `A ${radius} ${radius} 0 0 ${mirror ? 1 - sweep : sweep} ${x} ${y}`;
      }
      const [x, y] = flip(rest[0]);
      return `${kind} ${x} ${y}`;
    })
    .join(" ")} Z`;
}

const rightSide = {
  "corner mid-range": [
    ["M", [laneHalfWidth, baselineY]],
    ["L", [threePointSidelineX, baselineY]],
    ["L", arcStart],
    ["A", threePointRadius, 1, arcAtCorner],
    ["L", laneAtCorner],
  ],
  "wing mid-range": [
    ["M", laneAtCorner],
    ["L", arcAtCorner],
    ["A", threePointRadius, 1, arcAtWing],
    ["L", laneTopAtWing],
    ["L", [laneHalfWidth, freeThrowY]],
  ],
  "corner 3": [
    ["M", [threePointSidelineX, baselineY]],
    ["L", [halfWidth, baselineY]],
    ["L", [halfWidth, CORNER_THREE_MAX_Y]],
    ["L", arcStart],
  ],
  "wing 3": [
    ["M", arcStart],
    ["L", [halfWidth, CORNER_THREE_MAX_Y]],
    ["L", deepAtSideline],
    ["A", DEEP_THREE_DISTANCE, 1, deepAtWing],
    ["L", arcAtWing],
    ["A", threePointRadius, 0, arcStart],
  ],
};

const restrictedArea = path([
  ["M", [restrictedRadius, baselineY]],
  ["L", [restrictedRadius, 0]],
  ["A", restrictedRadius, 1, [-restrictedRadius, 0]],
  ["L", [-restrictedRadius, baselineY]],
]);

const lane = path([
  ["M", [laneHalfWidth, baselineY]],
  ["L", [laneHalfWidth, freeThrowY]],
  ["L", [-laneHalfWidth, freeThrowY]],
  ["L", [-laneHalfWidth, baselineY]],
]);

// Zone name -> path. The paint is the whole lane with the restricted area cut out (draw with fill-rule evenodd).
export const ZONE_SHAPES = {
  "Restricted area": restrictedArea,
  "In the paint": `${lane} ${restrictedArea}`,
  "Left corner mid-range": path(rightSide["corner mid-range"], true),
  "Left wing mid-range": path(rightSide["wing mid-range"], true),
  "Central mid-range": path([
    ["M", laneTopAtWing],
    ["L", arcAtWing],
    ["A", threePointRadius, 1, mirrorPoint(arcAtWing)],
    ["L", mirrorPoint(laneTopAtWing)],
  ]),
  "Right wing mid-range": path(rightSide["wing mid-range"]),
  "Right corner mid-range": path(rightSide["corner mid-range"]),
  "Left corner 3": path(rightSide["corner 3"], true),
  "Left wing 3": path(rightSide["wing 3"], true),
  "Top of the key 3": path([
    ["M", arcAtWing],
    ["L", deepAtWing],
    ["A", DEEP_THREE_DISTANCE, 1, mirrorPoint(deepAtWing)],
    ["L", mirrorPoint(arcAtWing)],
    ["A", threePointRadius, 0, arcAtWing],
  ]),
  "Right wing 3": path(rightSide["wing 3"]),
  "Right corner 3": path(rightSide["corner 3"]),
  "Deep 3": path([
    ["M", deepAtSideline],
    ["A", DEEP_THREE_DISTANCE, 1, mirrorPoint(deepAtSideline)],
    ["L", [-halfWidth, halfCourtY]],
    ["L", [halfWidth, halfCourtY]],
  ]),
};

// Where each zone's made/attempts chip sits, in the feed's frame.
export const ZONE_LABEL_POINTS = {
  "Restricted area": [0, 70],
  "In the paint": [0, 290],
  "Left corner mid-range": [-450, 90],
  "Left wing mid-range": [-345, 395],
  "Central mid-range": [0, 540],
  "Right wing mid-range": [345, 395],
  "Right corner mid-range": [450, 90],
  "Left corner 3": [-705, -5],
  "Left wing 3": [-560, 520],
  "Top of the key 3": [0, 770],
  "Right wing 3": [560, 520],
  "Right corner 3": [705, -5],
  "Deep 3": [0, 1080],
};
