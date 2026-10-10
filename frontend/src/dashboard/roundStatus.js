const DAY_MS = 86_400_000;

const localMidnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
// Whole local calendar days from `now`'s date to `date`'s (a day is not always 24 hours, so the difference is rounded).
const daysBetween = (date, now) => Math.round((localMidnight(date) - localMidnight(now)) / DAY_MS);

const timeOfDay = (date) => date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const shortDate = (date) => date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

// "today at 18:45", "tomorrow at 18:45", or the short date and time from two days on. Times and days are the viewer's own.
function when(date, now) {
  const days = daysBetween(date, now);
  if (days === 0) return `today at ${timeOfDay(date)}`;
  if (days === 1) return `tomorrow at ${timeOfDay(date)}`;
  return `${shortDate(date)}, ${timeOfDay(date)}`;
}

// Where a round stands, from its games (each with `scheduledAt`, a UTC instant, and `played`) and the current time. There is no live
// state: nothing here claims a game is being played. A round whose games have no start time has no line.
export function roundStatus(games, now) {
  const dated = games.filter((game) => game.scheduledAt).map((game) => ({ ...game, start: new Date(game.scheduledAt) }));
  if (dated.length === 0) return null;

  const firstStart = new Date(Math.min(...dated.map((game) => game.start.getTime())));
  if (now < firstStart) {
    const days = daysBetween(firstStart, now);
    return { line: days <= 1 ? `Starts ${when(firstStart, now)}` : `Starts in ${days} days (${shortDate(firstStart)}, ${timeOfDay(firstStart)})` };
  }

  const played = games.filter((game) => game.played).length;
  const next = dated.filter((game) => !game.played && game.start > now).sort((a, b) => a.start - b.start)[0];
  return { line: `Under way · ${played} of ${games.length} games played${next ? ` · next game ${when(next.start, now)}` : ""}` };
}
