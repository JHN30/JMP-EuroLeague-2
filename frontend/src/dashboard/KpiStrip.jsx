import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getLeagueTeamStats, getSeasonStandings } from "../lib/api";
import CompactMetric from "../lib/CompactMetric";
import { formatPerGame } from "../lib/format";
import HeaderStats from "../lib/HeaderStats";

function parseWins(record) {
  if (!record) return null;
  const wins = Number(record.split("-")[0]);
  return Number.isFinite(wins) ? wins : null;
}

export default function KpiStrip() {
  const { seasonCode } = useParams();

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const standings = standingsQuery.data?.standings ?? [];
  // Best offense and defense come from the pipeline's team totals, which count overtime. The official standings' points
  // are regulation time only, so they would pick the wrong club when overtime games differ between clubs.
  const teamStatsQuery = useQuery({
    queryKey: ["league-team-stats", seasonCode, "RS"],
    queryFn: () => getLeagueTeamStats(seasonCode, "RS"),
  });
  const standingByClub = new Map(standings.map((entry) => [entry.clubCode, entry]));

  const leader = standings.find((entry) => entry.basic?.position === 1) ?? null;

  let bestOffense = null;
  let bestDefense = null;
  let inForm = null;
  for (const team of teamStatsQuery.data?.teams ?? []) {
    const entry = standingByClub.get(team.clubCode);
    const gamesPlayed = Number(team.gamesPlayed);
    if (!entry || !gamesPlayed) continue;
    const scored = Number(team.own?.points);
    const allowed = Number(team.opponent?.points);
    if (Number.isFinite(scored)) {
      const ppg = scored / gamesPlayed;
      if (bestOffense === null || ppg > bestOffense.ppg) bestOffense = { entry, ppg };
    }
    if (Number.isFinite(allowed)) {
      const papg = allowed / gamesPlayed;
      if (bestDefense === null || papg < bestDefense.papg) bestDefense = { entry, papg };
    }
  }
  for (const entry of standings) {
    const wins = parseWins(entry.basic?.lastTenRecord);
    if (wins !== null && (inForm === null || wins > inForm.wins)) {
      inForm = { entry, wins };
    }
  }

  return (
    <HeaderStats className="kpi-strip-4" data-testid="home-kpi-strip">
      <CompactMetric
        isLoading={standingsQuery.isLoading}
        isError={standingsQuery.isError}
        value={leader ? `${leader.basic.gamesWon}-${leader.basic.gamesLost}` : "–"}
        label="Leader in wins"
        name={leader?.clubName ?? leader?.clubCode}
        imageUrl={leader?.crestUrl}
      />
      <CompactMetric
        isLoading={standingsQuery.isLoading}
        isError={standingsQuery.isError}
        value={inForm ? inForm.entry.basic.lastTenRecord : "–"}
        label="In-form team · Last 10"
        name={inForm?.entry.clubName ?? inForm?.entry.clubCode}
        imageUrl={inForm?.entry.crestUrl}
      />
      <CompactMetric
        isLoading={standingsQuery.isLoading || teamStatsQuery.isLoading}
        isError={standingsQuery.isError || teamStatsQuery.isError}
        value={bestOffense ? formatPerGame(bestOffense.ppg) : "–"}
        label="Best offense"
        name={bestOffense?.entry.clubName ?? bestOffense?.entry.clubCode}
        imageUrl={bestOffense?.entry.crestUrl}
      />
      <CompactMetric
        isLoading={standingsQuery.isLoading || teamStatsQuery.isLoading}
        isError={standingsQuery.isError || teamStatsQuery.isError}
        value={bestDefense ? formatPerGame(bestDefense.papg) : "–"}
        label="Best defense"
        name={bestDefense?.entry.clubName ?? bestDefense?.entry.clubCode}
        imageUrl={bestDefense?.entry.crestUrl}
      />
    </HeaderStats>
  );
}
