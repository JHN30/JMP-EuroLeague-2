import { useQuery } from "@tanstack/react-query";
import { getSeasonStandings } from "../lib/api";
import CompactMetric from "../lib/CompactMetric";
import { formatPerGame } from "../lib/format";
import HeaderStats from "../lib/HeaderStats";

export default function StandingsKpiStrip({ seasonCode, phaseCode, round, standings }) {
  const previousRoundQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode, "round", round ? round - 1 : null],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode, { round: round - 1 }),
    enabled: Boolean(round && round > 1),
  });

  const leader = standings.find((entry) => entry.basic?.position === 1) ?? null;
  const cutoff = standings.find((entry) => entry.basic?.position === 6) ?? null;

  let biggestRiser = null;
  let biggestFaller = null;
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
      if (delta > 0 && (biggestRiser === null || delta > biggestRiser.delta)) {
        biggestRiser = { entry, delta };
      }
      if (delta < 0 && (biggestFaller === null || delta < biggestFaller.delta)) {
        biggestFaller = { entry, delta };
      }
    }
  }

  const marginEntries = standings.filter(
    (entry) => entry.basic?.pointsDifference != null && entry.basic?.gamesPlayed,
  );
  const avgMargin = formatPerGame(
    marginEntries.length > 0
      ? marginEntries.reduce((sum, entry) => sum + Math.abs(entry.basic.pointsDifference) / entry.basic.gamesPlayed, 0) /
          marginEntries.length
      : null,
  );

  return (
    <HeaderStats>
      <CompactMetric
        value={leader ? `${leader.basic.gamesWon}-${leader.basic.gamesLost}` : "–"}
        label={leader ? `Leader · ${leader.clubName ?? leader.clubCode}` : "Leader"}
      />
      {cutoff ? (
        <CompactMetric
          value={`${cutoff.basic.gamesWon}-${cutoff.basic.gamesLost}`}
          label={`Playoff cutoff · ${cutoff.clubName ?? cutoff.clubCode}`}
        />
      ) : null}
      {round && round > 1 ? (
        <CompactMetric
          isLoading={previousRoundQuery.isLoading}
          isError={previousRoundQuery.isError}
          value={biggestRiser ? `▲ ${Math.abs(biggestRiser.delta)}` : "–"}
          label={biggestRiser ? `Biggest riser · ${biggestRiser.entry.clubName ?? biggestRiser.entry.clubCode}` : "Biggest riser"}
        />
      ) : null}
      {round && round > 1 ? (
        <CompactMetric
          isLoading={previousRoundQuery.isLoading}
          isError={previousRoundQuery.isError}
          value={biggestFaller ? `▼ ${Math.abs(biggestFaller.delta)}` : "–"}
          label={biggestFaller ? `Biggest faller · ${biggestFaller.entry.clubName ?? biggestFaller.entry.clubCode}` : "Biggest faller"}
        />
      ) : null}
      <CompactMetric value={avgMargin} label="Avg margin of victory" />
    </HeaderStats>
  );
}
