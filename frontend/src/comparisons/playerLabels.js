import { displayName, nameParts } from "../lib/playerName";

// "Alston Jr., Derrick" as the comparison tabs show it: "Derrick Alston Jr.".
export const fullName = displayName;

// How the two players are named in a chart's legend and tooltips: by last name, or by full name when the two share one.
export function chartNames(labelA, labelB) {
  const a = nameParts(labelA).last;
  const b = nameParts(labelB).last;
  if (a.toLowerCase() === b.toLowerCase()) return [fullName(labelA), fullName(labelB)];
  return [a, b];
}
