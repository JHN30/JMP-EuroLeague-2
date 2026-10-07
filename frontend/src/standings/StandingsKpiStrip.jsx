import { useQuery } from "@tanstack/react-query";
import { getSeasonStandings } from "../lib/api";
import CompactMetric from "../lib/CompactMetric";
import { formatSignedDecimal } from "../lib/format";
import HeaderStats from "../lib/HeaderStats";

function clubLabel(entry) {
  return entry.clubName ?? entry.clubCode;
}

// `netQuery` is the phase's advanced-standings query (shared with the table's Net rtg column). Best net rating is
// the efficiency view of who is strongest, distinct from Home's raw best offense and defense.
export default function StandingsKpiStrip({ seasonCode, phaseCode, round, standings, netQuery }) {
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

  let bestNet = null;
  for (const row of netQuery.data?.standings ?? []) {
    if (row.netRating !== null && (bestNet === null || row.netRating > bestNet.netRating)) bestNet = row;
  }

  return (
    <HeaderStats className="kpi-strip-5" data-testid="standings-kpi-strip">
      <CompactMetric
        value={leader ? `${leader.basic.gamesWon}-${leader.basic.gamesLost}` : "–"}
        label="Leader"
        name={leader ? clubLabel(leader) : undefined}
        imageUrl={leader?.crestUrl}
      />
      {cutoff ? (
        <CompactMetric
          value={`${cutoff.basic.gamesWon}-${cutoff.basic.gamesLost}`}
          label="Playoff cutoff"
          name={clubLabel(cutoff)}
          imageUrl={cutoff.crestUrl}
        />
      ) : null}
      {round && round > 1 ? (
        <CompactMetric
          isLoading={previousRoundQuery.isLoading}
          isError={previousRoundQuery.isError}
          value={biggestRiser ? `▲ ${Math.abs(biggestRiser.delta)}` : "–"}
          label="Biggest riser"
          name={biggestRiser ? clubLabel(biggestRiser.entry) : undefined}
          imageUrl={biggestRiser?.entry.crestUrl}
          tone={biggestRiser ? "positive" : undefined}
        />
      ) : null}
      {round && round > 1 ? (
        <CompactMetric
          isLoading={previousRoundQuery.isLoading}
          isError={previousRoundQuery.isError}
          value={biggestFaller ? `▼ ${Math.abs(biggestFaller.delta)}` : "–"}
          label="Biggest faller"
          name={biggestFaller ? clubLabel(biggestFaller.entry) : undefined}
          imageUrl={biggestFaller?.entry.crestUrl}
          tone={biggestFaller ? "negative" : undefined}
        />
      ) : null}
      <CompactMetric
        isLoading={netQuery.isLoading}
        isError={netQuery.isError}
        value={bestNet ? formatSignedDecimal(bestNet.netRating) : "–"}
        label="Best net rating"
        name={bestNet ? clubLabel(bestNet) : undefined}
        imageUrl={bestNet?.crestUrl}
      />
    </HeaderStats>
  );
}
