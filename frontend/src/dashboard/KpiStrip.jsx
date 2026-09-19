import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getLeaderStats, getRounds, getSeasonStandings } from "../lib/api";

function KpiChip({ isLoading, isError, value, label }) {
  return (
    <div className="kpi-chip">
      <span className="value" title={isError ? "Could not load this value." : undefined}>
        {isLoading ? "–" : isError ? "–" : value}
      </span>
      <span className="label">{label}</span>
    </div>
  );
}

export default function KpiStrip() {
  const { seasonCode } = useParams();

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const round = standingsQuery.data?.round ?? null;
  const standings = standingsQuery.data?.standings ?? [];

  const roundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, "RS"],
    queryFn: () => getRounds(seasonCode, "RS"),
  });
  const totalRounds = roundsQuery.data?.rounds.length ?? null;

  const topScorerQuery = useQuery({
    queryKey: ["leader-stats", seasonCode, "all", "perGame", "pointsScored"],
    queryFn: () =>
      getLeaderStats(seasonCode, { phase: "all", mode: "perGame", sort: "pointsScored", order: "desc", limit: 1 }),
  });
  const topScorer = topScorerQuery.data?.players[0] ?? null;

  const previousRoundQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS", "round", round ? round - 1 : null],
    queryFn: () => getSeasonStandings(seasonCode, "RS", { round: round - 1 }),
    enabled: Boolean(round && round > 1),
  });

  const leader = standings.find((entry) => entry.basic?.position === 1) ?? null;

  const gamesWithPoints = standings.filter(
    (entry) => entry.basic?.pointsFor != null && entry.basic?.gamesPlayed,
  );
  const leagueAvgPpg =
    gamesWithPoints.length > 0
      ? (
          gamesWithPoints.reduce((sum, entry) => sum + entry.basic.pointsFor / entry.basic.gamesPlayed, 0) /
          gamesWithPoints.length
        ).toFixed(1)
      : null;

  let biggestMover = null;
  if (previousRoundQuery.data?.standings.length) {
    const previousPositionByClub = new Map(
      previousRoundQuery.data.standings.map((entry) => [entry.clubCode, entry.basic?.position ?? null]),
    );
    for (const entry of standings) {
      const previousPosition = previousPositionByClub.get(entry.clubCode);
      const currentPosition = entry.basic?.position;
      if (previousPosition == null || currentPosition == null) continue;
      const delta = previousPosition - currentPosition;
      if (delta === 0) continue;
      if (biggestMover === null || Math.abs(delta) > Math.abs(biggestMover.delta)) {
        biggestMover = { entry, delta };
      }
    }
  }

  return (
    <div className="kpi-strip">
      <KpiChip
        isLoading={standingsQuery.isLoading || roundsQuery.isLoading}
        isError={standingsQuery.isError || roundsQuery.isError}
        value={round != null && totalRounds != null ? `${round} / ${totalRounds}` : "–"}
        label="Round in progress"
      />
      <KpiChip
        isLoading={standingsQuery.isLoading}
        isError={standingsQuery.isError}
        value={leader ? `${leader.basic.gamesWon}-${leader.basic.gamesLost}` : "–"}
        label={leader ? `Leader · ${leader.clubName ?? leader.clubCode}` : "Leader"}
      />
      <KpiChip
        isLoading={topScorerQuery.isLoading}
        isError={topScorerQuery.isError}
        value={topScorer?.traditional.pointsScored ?? "–"}
        label={topScorer ? `Top scorer · ${topScorer.playerName ?? topScorer.personKey}` : "Top scorer"}
      />
      <KpiChip
        isLoading={standingsQuery.isLoading}
        isError={standingsQuery.isError}
        value={leagueAvgPpg ?? "–"}
        label="League avg PPG"
      />
      {round && round > 1 ? (
        <KpiChip
          isLoading={previousRoundQuery.isLoading}
          isError={previousRoundQuery.isError}
          value={biggestMover ? `${biggestMover.delta > 0 ? "▲" : "▼"} ${Math.abs(biggestMover.delta)}` : "–"}
          label={
            biggestMover
              ? `Biggest mover · ${biggestMover.entry.clubName ?? biggestMover.entry.clubCode}`
              : "Biggest mover"
          }
        />
      ) : null}
    </div>
  );
}
