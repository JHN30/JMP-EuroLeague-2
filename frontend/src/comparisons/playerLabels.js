import { nameParts, titleCase } from "../lib/playerName";

// "ALSTON JR. , DERRICK" as the comparison tabs show it: "Derrick Alston Jr.".
export function fullName(label) {
  const { last, first } = nameParts(label);
  return `${titleCase(first)} ${titleCase(last)}`.trim();
}

// How the two players are named in a chart's legend and tooltips: by last name, or by full name when the two share one.
export function chartNames(labelA, labelB) {
  const a = nameParts(labelA).last.toLowerCase();
  const b = nameParts(labelB).last.toLowerCase();
  if (a === b) return [fullName(labelA), fullName(labelB)];
  return [titleCase(nameParts(labelA).last), titleCase(nameParts(labelB).last)];
}
