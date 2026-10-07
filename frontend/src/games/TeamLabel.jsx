import { shortTeamName, teamName } from "./gameUtils";

// A team's name: the short one below sm, where there is little room, and the full one from sm. Below sm the full name stays
// in the page for screen readers (visually hidden), and the short one is hidden from them, so the name is read once.
export function TeamName({ team }) {
  const full = teamName(team);
  const short = shortTeamName(team);
  if (short === full) return full;
  return (
    <>
      <span aria-hidden="true" className="sm:hidden">
        {short}
      </span>
      <span className="max-sm:sr-only">{full}</span>
    </>
  );
}

// A team's crest and name on one line.
export default function TeamLabel({ team }) {
  return (
    <div className="flex items-center gap-2">
      {team?.crestUrl ? (
        <img
          src={team.crestUrl}
          alt=""
          className="h-6 w-6 flex-none object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span className="font-semibold">
        <TeamName team={team} />
      </span>
    </div>
  );
}
