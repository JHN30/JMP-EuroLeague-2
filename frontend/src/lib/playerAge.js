// A player's age and birth date from the API's `birthDate` (YYYY-MM-DD), shared by the players list and the player page.

// The age on 1 October of the season's first year, so a past season shows how old the player was then.
export function ageAtSeasonStart(birthDate, seasonCode) {
  const startYear = Number(String(seasonCode).replace(/\D/g, ""));
  if (!birthDate || !startYear) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const beforeBirthday = month > 10 || (month === 10 && day > 1);
  return startYear - year - (beforeBirthday ? 1 : 0);
}

// "15 Dec 1995": the date as written, never shifted by a time zone (a bare date string would be read as UTC midnight).
export function formatBirthDate(birthDate) {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
