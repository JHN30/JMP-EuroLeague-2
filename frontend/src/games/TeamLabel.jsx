import { teamName } from "./gameUtils";

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
      <span className="font-semibold">{teamName(team)}</span>
    </div>
  );
}
