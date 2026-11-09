// Person names arrive in display form, "Surname, Given" ("Brown III, John", "Dozier, PJ"), and are shown as stored:
// re-casing them would break suffixes and inner capitals ("III" -> "Iii", "McCarty" -> "Mccarty").

// Venue names still arrive in capitals ("BELGRADE ARENA"); the occasional name with its own lower-case letters is kept.
function titleCase(text) {
  return (text ?? "").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (match, lead, letter) => lead + letter.toUpperCase());
}

export function readableName(name) {
  return /[a-z]/.test(name) ? name : titleCase(name);
}

// "Jones, Carlik" as it reads in a title or a sentence: "Carlik Jones".
export function displayName(fullName) {
  const { last, first } = nameParts(fullName);
  return `${first} ${last}`.trim();
}

export function nameParts(fullName) {
  const [last = "", first = ""] = (fullName ?? "TBD").split(",").map((part) => part.trim());
  return { last, first };
}
