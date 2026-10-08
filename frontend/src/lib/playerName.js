// The feed writes names as "LAUVERGNE, JOFFREY" -> { last: "LAUVERGNE", first: "JOFFREY" }.
// "ALSTON JR." -> "Alston Jr.": the feed writes names in capitals, which reads as shouting inside a sentence.
export function titleCase(text) {
  return (text ?? "").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (match, lead, letter) => lead + letter.toUpperCase());
}

// "JONES, CARLIK" as it reads in a title or a sentence: "Carlik Jones".
export function displayName(fullName) {
  const { last, first } = nameParts(fullName);
  return (titleCase(first) + " " + titleCase(last)).trim();
}

// "HIFI, NADIR" without the feed's comma: "HIFI NADIR".
export function withoutComma(fullName) {
  return (fullName ?? "").replace(/\s*,\s*/g, " ");
}

export function nameParts(fullName) {
  const [last = "", first = ""] = (fullName ?? "TBD").split(",").map((part) => part.trim());
  return { last, first };
}
