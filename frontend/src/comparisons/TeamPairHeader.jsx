import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { TeamName } from "../games/TeamLabel";
import { teamName } from "../games/gameUtils";
import { getSeasonStandings } from "../lib/api";
import Panel from "../lib/Panel";
import { ordinal } from "../lib/seasonFormat";

// The crest in a fixed slot, so a club with no crest, or one that fails to load, leaves the layout as it is.
function Crest({ team }) {
  const [failed, setFailed] = useState(false);
  const slot = "h-9 w-9 flex-none sm:h-12 sm:w-12";
  if (!team?.crestUrl || failed) return <div aria-hidden="true" className={slot} />;
  return <img src={team.crestUrl} alt="" className={`${slot} object-contain`} onError={() => setFailed(true)} />;
}

// One club: its crest over its name below sm, where a side is too narrow for both on one line, and beside it from sm (TV code
// below sm, full name from sm), both opening its team page, over its regular-season place and record. `alignEnd` mirrors it from
// sm, so both crests sit next to the "vs".
function Side({ seasonCode, team, standing, alignEnd = false }) {
  const basic = standing?.basic;
  return (
    <div className={`flex min-w-0 flex-col items-center gap-1 text-center sm:gap-3 ${alignEnd ? "sm:flex-row-reverse sm:text-right" : "sm:flex-row sm:text-left"}`}>
      <Link to={`/${seasonCode}/teams/${team.clubCode}`} aria-hidden="true" tabIndex={-1} className="flex-none">
        <Crest team={team} />
      </Link>
      <div className="min-w-0">
        <Link to={`/${seasonCode}/teams/${team.clubCode}`} className="block text-base leading-tight font-bold wrap-anywhere hover:underline sm:text-xl">
          <TeamName team={team} />
        </Link>
        {basic?.position ? (
          <p className="muted text-xs whitespace-nowrap tabular-nums sm:text-sm">
            {ordinal(basic.position)} · {basic.gamesWon}-{basic.gamesLost}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// The page header of a team comparison, as the game page's header shows a game's two clubs: the kicker over "vs" between the two
// clubs, and `children` (what the comparison was opened from, and the ways on) centred under them. The page's heading names both
// clubs for screen readers. `teamA` and `teamB` are season team rows (club code, names, TV code, crest).
export default function TeamPairHeader({ seasonCode, kicker, teamA, teamB, children }) {
  // The same regular-season standings the upcoming game cards show their records from.
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
    retry: false,
  });
  const standingOf = (team) => standingsQuery.data?.standings?.find((entry) => entry.clubCode === team.clubCode) ?? null;
  return (
    <Panel as="section" aria-label="Clubs compared" className="relative mb-6 overflow-hidden p-4">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <h1 className="sr-only">
        Compare {teamName(teamA)} and {teamName(teamB)}
      </h1>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        <Side seasonCode={seasonCode} team={teamA} standing={standingOf(teamA)} />
        <div className="flex flex-col items-center">
          <p className="eyebrow text-center max-sm:text-[0.6rem]">{kicker}</p>
          <span className="muted text-lg font-semibold tracking-wide uppercase sm:text-2xl">vs</span>
        </div>
        <Side seasonCode={seasonCode} team={teamB} standing={standingOf(teamB)} alignEnd />
      </div>
      {children ?? null}
    </Panel>
  );
}
