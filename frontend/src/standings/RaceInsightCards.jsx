import { useMemo } from "react";
import { Link } from "react-router";

const PLAYIN_CUTOFF = 10;

function computeInsights(rounds, standingsByRound, teamOrder) {
  if (rounds.length === 0 || teamOrder.length === 0) return null;

  const firstRound = rounds[0];
  const lastRound = rounds[rounds.length - 1];

  let leader = null;
  let climber = null;
  let consistent = null;
  let mostQualified = null;

  for (const team of teamOrder) {
    const firstPosition = standingsByRound.get(firstRound)?.get(team.clubCode) ?? null;
    const lastPosition = standingsByRound.get(lastRound)?.get(team.clubCode) ?? null;
    if (lastPosition === 1 && !leader) leader = team;

    if (firstPosition != null && lastPosition != null) {
      const gain = firstPosition - lastPosition;
      if (!climber || gain > climber.gain) climber = { ...team, gain };
    }

    const positions = rounds.map((round) => standingsByRound.get(round)?.get(team.clubCode)).filter((p) => p != null);
    if (positions.length > 1) {
      const range = Math.max(...positions) - Math.min(...positions);
      if (!consistent || range < consistent.range) consistent = { ...team, range };
    }

    const qualifiedRounds = positions.filter((p) => p <= PLAYIN_CUTOFF).length;
    if (!mostQualified || qualifiedRounds > mostQualified.qualifiedRounds) {
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
      <span className="eyebrow">{label}</span>
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
      <InsightCard label="Current leader" team={insights.leader} seasonCode={seasonCode} />
      <InsightCard
        label="Biggest climber"
        team={insights.climber}
        detail={insights.climber ? `+${insights.climber.gain} position${insights.climber.gain === 1 ? "" : "s"}` : null}
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
        detail={insights.mostQualified ? `${insights.mostQualified.qualifiedRounds} of ${rounds.length} rounds` : null}
        seasonCode={seasonCode}
      />
    </div>
  );
}
