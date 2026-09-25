import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getSeasonStandings } from "../lib/api";
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

  const leader = standings.find((entry) => entry.basic?.position === 1) ?? null;

  let bestOffense = null;
  let bestDefense = null;
  let inForm = null;
  for (const entry of standings) {
    const gamesPlayed = entry.basic?.gamesPlayed;
    if (gamesPlayed) {
      if (entry.basic.pointsFor != null) {
        const ppg = entry.basic.pointsFor / gamesPlayed;
        if (bestOffense === null || ppg > bestOffense.ppg) bestOffense = { entry, ppg };
      }
      if (entry.basic.pointsAgainst != null) {
        const papg = entry.basic.pointsAgainst / gamesPlayed;
        if (bestDefense === null || papg < bestDefense.papg) bestDefense = { entry, papg };
      }
    }
    const wins = parseWins(entry.basic?.lastTenRecord);
    if (wins !== null && (inForm === null || wins > inForm.wins)) {
      inForm = { entry, wins };
    }
  }

  return (
    <HeaderStats className="kpi-strip-4">
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
        isLoading={standingsQuery.isLoading}
        isError={standingsQuery.isError}
        value={bestOffense ? formatPerGame(bestOffense.ppg) : "–"}
        label="Best offense"
        name={bestOffense?.entry.clubName ?? bestOffense?.entry.clubCode}
        imageUrl={bestOffense?.entry.crestUrl}
      />
      <CompactMetric
        isLoading={standingsQuery.isLoading}
        isError={standingsQuery.isError}
        value={bestDefense ? formatPerGame(bestDefense.papg) : "–"}
        label="Best defense"
        name={bestDefense?.entry.clubName ?? bestDefense?.entry.clubCode}
        imageUrl={bestDefense?.entry.crestUrl}
      />
    </HeaderStats>
  );
}
