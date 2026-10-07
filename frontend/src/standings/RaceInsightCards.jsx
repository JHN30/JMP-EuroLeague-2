import { useMemo } from "react";
import { Link } from "react-router";

const PLAYIN_CUTOFF = 10;

function computeInsights(rounds, standingsByRound, teamOrder) {
  if (teamOrder.length === 0) return null;
  if (rounds.length === 0) return { leader: null, climber: null, consistent: null, mostQualified: null };

  // The climber is the biggest jump in the latest round alone (the same movement the table shows), not the gap since
  // the season opened.
  const previousRound = rounds.length > 1 ? rounds[rounds.length - 2] : null;
  const lastRound = rounds[rounds.length - 1];

  let leader = null;
  let climber = null;
  let consistent = null;
  let mostQualified = null;

  for (const team of teamOrder) {
    const previousPosition = previousRound != null ? (standingsByRound.get(previousRound)?.get(team.clubCode) ?? null) : null;
    const lastPosition = standingsByRound.get(lastRound)?.get(team.clubCode) ?? null;
    if (lastPosition === 1 && !leader) leader = team;

    if (previousPosition != null && lastPosition != null) {
      const gain = previousPosition - lastPosition;
      if (gain > 0 && (!climber || gain > climber.gain || (gain === climber.gain && lastPosition < climber.position))) {
        climber = { ...team, gain, position: lastPosition };
      }
    }

    const positions = rounds.map((round) => standingsByRound.get(round)?.get(team.clubCode)).filter((p) => p != null);
    if (positions.length > 1) {
      const range = Math.max(...positions) - Math.min(...positions);
      if (!consistent || range < consistent.range) consistent = { ...team, range };
    }

    const qualifiedRounds = positions.filter((p) => p <= PLAYIN_CUTOFF).length;
    if (qualifiedRounds > 0 && (!mostQualified || qualifiedRounds > mostQualified.qualifiedRounds)) {
      mostQualified = { ...team, qualifiedRounds };
    }
  }

  return { leader, climber, consistent, mostQualified };
}

function InsightCard({ label, team, detail, seasonCode }) {
  return (
    <Link
      to={team ? `/${seasonCode}/teams/${team.clubCode}` : "#"}
      className="panel flex flex-col gap-1 p-3 hover:bg-base-200"
    >
      <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between">
        <span className="eyebrow">{label}</span>
        {team?.crestUrl ? (
          <img
            src={team.crestUrl}
            alt=""
            className="h-9 w-9 flex-none object-contain sm:h-10 sm:w-10"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
      </div>
      <span className="font-semibold">{team ? (team.clubName ?? team.clubCode) : "-"}</span>
      {detail ? <span className="text-xs text-base-content/70">{detail}</span> : null}
    </Link>
  );
}

export default function RaceInsightCards({ seasonCode, rounds, standingsByRound, teamOrder }) {
  const insights = useMemo(
    () => computeInsights(rounds, standingsByRound, teamOrder),
    [rounds, standingsByRound, teamOrder],
  );

  if (!insights) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <InsightCard label="Leader" team={insights.leader} seasonCode={seasonCode} />
      <InsightCard
        label="Biggest climber"
        team={insights.climber}
        detail={insights.climber ? `+${insights.climber.gain} position${insights.climber.gain === 1 ? "" : "s"} this round` : null}
        seasonCode={seasonCode}
      />
      <InsightCard
        label="Most consistent"
        team={insights.consistent}
        detail={insights.consistent ? `${insights.consistent.range}-position range` : null}
        seasonCode={seasonCode}
      />
      <InsightCard
        label="Most time in contention"
        team={insights.mostQualified}
        detail={insights.mostQualified ? `${insights.mostQualified.qualifiedRounds} of ${rounds.length} round${rounds.length === 1 ? "" : "s"}` : null}
        seasonCode={seasonCode}
      />
    </div>
  );
}
