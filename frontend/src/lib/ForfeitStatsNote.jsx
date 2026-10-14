import { useQuery } from "@tanstack/react-query";
import { getLeagueTeamStats } from "./api";
import { useForfeitClubs } from "./useForfeitClubs";

// A short flag where team totals sit one game short of the standings because of a recorded forfeit: the totals cover the games played on
// court, while the standings also count the awarded result. With `clubCodes` it speaks only for those clubs (a team page or a comparison);
// without, for every club that played the forfeit (a board). It waits for the club's games played, so it never shows without the number.
export default function ForfeitStatsNote({ seasonCode, phaseCode, clubCodes = null, className = "muted text-sm" }) {
  const clubs = useForfeitClubs(seasonCode, phaseCode);
  const entries = [...clubs].filter(([code]) => !clubCodes || clubCodes.includes(code));
  const statsQuery = useQuery({ queryKey: ["league-team-stats", seasonCode, phaseCode], queryFn: () => getLeagueTeamStats(seasonCode, phaseCode), enabled: Boolean(phaseCode) && entries.length > 0 });
  if (entries.length === 0) return null;
  const gamesPlayed = statsQuery.data?.teams?.find((team) => team.clubCode === entries[0][0])?.gamesPlayed;
  if (!gamesPlayed) return null;
  const [, first] = entries[0];
  return (
    <p role="note" className={className}>
      {entries.length === 1
        ? `Totals cover ${gamesPlayed} games. The forfeit against ${first.opponent} (${first.own}-${first.other}) counts in the standings only.`
        : `Totals for ${entries.map(([, info]) => info.name).join(" and ")} cover ${gamesPlayed} games each. The forfeit between them (${first.name} ${first.own}-${first.other} ${first.opponent}) counts in the standings only.`}
    </p>
  );
}
