import ShortLabel from "../lib/ShortLabel";
import { shortTeamName, teamName } from "./gameUtils";
import Crest from "../lib/Crest";

// A team's name: its TV code (else its abbreviated name) below sm, where there is little room, and the full name from sm. Below sm the full name stays
// in the page for screen readers (visually hidden), and the code is hidden from them, so the name is read once.
export function TeamName({ team }) {
  const full = teamName(team);
  const short = team?.tvCode ?? shortTeamName(team);
  if (short === full) return full;
  return <ShortLabel short={short} full={full} />;
}

// A team's crest and name on one line.
export default function TeamLabel({ team }) {
  return (
    <div className="flex items-center gap-2">
      <Crest url={team?.crestUrl} className="h-6 w-6 flex-none" animate={false} />
      <span className="font-semibold">
        <TeamName team={team} />
      </span>
    </div>
  );
}
