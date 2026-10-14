import { useForfeitClubs } from "./useForfeitClubs";

// A short note where team totals are missing because of a recorded forfeit. With `clubCodes` it speaks only for those clubs (a team
// page or a comparison); without, for every club that played the forfeit (a board).
export default function ForfeitStatsNote({ seasonCode, phaseCode, clubCodes = null, className = "muted text-sm" }) {
  const clubs = useForfeitClubs(seasonCode, phaseCode);
  const names = [...clubs].filter(([code]) => !clubCodes || clubCodes.includes(code)).map(([, name]) => name);
  if (names.length === 0) return null;
  return (
    <p role="note" className={className}>
      Team totals are unavailable for {names.join(" and ")} in this phase: it includes a recorded forfeit, and the source has no performance data for that game.
    </p>
  );
}
