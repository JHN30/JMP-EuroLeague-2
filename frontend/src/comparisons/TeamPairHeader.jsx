import { useState } from "react";
import { Link } from "react-router";
import { TeamName } from "../games/TeamLabel";
import { teamName } from "../games/gameUtils";
import Panel from "../lib/Panel";

// The crest in a fixed slot, so a club with no crest, or one that fails to load, leaves the layout as it is.
function Crest({ team }) {
  const [failed, setFailed] = useState(false);
  const slot = "h-12 w-12 flex-none sm:h-20 sm:w-20";
  if (!team?.crestUrl || failed) return <div aria-hidden="true" className={slot} />;
  return <img src={team.crestUrl} alt="" className={`${slot} object-contain`} onError={() => setFailed(true)} />;
}

// One club: its crest over its name (TV code below sm, full name from sm), both opening its team page.
function Side({ seasonCode, team }) {
  return (
    <Link to={`/${seasonCode}/teams/${team.clubCode}`} className="group flex min-w-0 flex-col items-center gap-1 rounded-field text-center sm:gap-2">
      <Crest team={team} />
      <span className="max-w-full text-lg leading-tight font-bold wrap-anywhere group-hover:underline sm:text-2xl">
        <TeamName team={team} />
      </span>
    </Link>
  );
}

// The page header of a team comparison, as the game page's header shows a game's two clubs: the kicker over "vs" between the two
// clubs, and `children` (what the comparison was opened from, and the ways on) centred under them. The page's heading names both
// clubs for screen readers. `teamA` and `teamB` are season team rows (club code, names, TV code, crest).
export default function TeamPairHeader({ seasonCode, kicker, teamA, teamB, children }) {
  return (
    <Panel as="section" aria-label="Clubs compared" className="relative mb-6 overflow-hidden p-4 sm:p-5">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <h1 className="sr-only">
        Compare {teamName(teamA)} and {teamName(teamB)}
      </h1>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        <Side seasonCode={seasonCode} team={teamA} />
        <div className="flex flex-col items-center gap-1">
          <p className="eyebrow text-center max-sm:text-[0.6rem]">{kicker}</p>
          <span className="muted text-xl font-semibold tracking-wide uppercase sm:text-3xl">vs</span>
        </div>
        <Side seasonCode={seasonCode} team={teamB} />
      </div>
      {children ?? null}
    </Panel>
  );
}
