import { useQuery } from "@tanstack/react-query";
import { getSeasonStandings } from "../lib/api";
import CompactMetric from "../lib/CompactMetric";
import { formatSignedDecimal } from "../lib/format";
import HeaderStats from "../lib/HeaderStats";
import { tierEnd } from "../lib/seasonFormat";

function clubLabel(entry) {
  return entry.clubName ?? entry.clubCode;
}

// `netQuery` is the phase's advanced-standings query (shared with the table's Net rtg column). Best net rating is
// the efficiency view of who is strongest, distinct from Home's raw best offense and defense.
export default function StandingsKpiStrip({ seasonCode, phaseCode, round, previousRound = round > 1 ? round - 1 : null, standings, netQuery, tiers = null, cutoffLabel = "Playoff cutoff" }) {
  const previousRoundQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode, "round", previousRound],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode, { round: previousRound }),
    enabled: previousRound !== null,
  });

  const leader = standings.find((entry) => entry.basic?.position === 1) ?? null;
  // The last direct qualifying place, from this stage's qualification lines.
  const cutoffPosition = tierEnd(tiers, "postseason");
  const cutoff = cutoffPosition === null ? null : (standings.find((entry) => entry.basic?.position === cutoffPosition) ?? null);

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

  const teamPage = (entry) => (entry?.clubCode ? `/${seasonCode}/teams/${entry.clubCode}` : undefined);

  return (
    <HeaderStats className="kpi-strip-5" data-testid="standings-kpi-strip">
      <CompactMetric
        value={leader ? `${leader.basic.gamesWon}-${leader.basic.gamesLost}` : "–"}
        label="Leader"
        name={leader ? clubLabel(leader) : undefined}
        imageUrl={leader?.crestUrl}
        to={teamPage(leader)}
      />
      {cutoff ? (
        <CompactMetric
          value={`${cutoff.basic.gamesWon}-${cutoff.basic.gamesLost}`}
          label={cutoffLabel}
          name={clubLabel(cutoff)}
          imageUrl={cutoff.crestUrl}
          to={teamPage(cutoff)}
        />
      ) : null}
      {previousRound !== null ? (
        <CompactMetric
          isLoading={previousRoundQuery.isLoading}
          skeleton
          isError={previousRoundQuery.isError}
          value={biggestRiser ? `▲ ${Math.abs(biggestRiser.delta)}` : "–"}
          label="Biggest riser"
          name={biggestRiser ? clubLabel(biggestRiser.entry) : undefined}
          imageUrl={biggestRiser?.entry.crestUrl}
          to={teamPage(biggestRiser?.entry)}
          tone={biggestRiser ? "positive" : undefined}
        />
      ) : null}
      {previousRound !== null ? (
        <CompactMetric
          isLoading={previousRoundQuery.isLoading}
          skeleton
          isError={previousRoundQuery.isError}
          value={biggestFaller ? `▼ ${Math.abs(biggestFaller.delta)}` : "–"}
          label="Biggest faller"
          name={biggestFaller ? clubLabel(biggestFaller.entry) : undefined}
          imageUrl={biggestFaller?.entry.crestUrl}
          to={teamPage(biggestFaller?.entry)}
          tone={biggestFaller ? "negative" : undefined}
        />
      ) : null}
      <CompactMetric
        isLoading={netQuery.isLoading}
        skeleton
        isError={netQuery.isError}
        value={bestNet ? formatSignedDecimal(bestNet.netRating) : "–"}
        label="Best net rating"
        name={bestNet ? clubLabel(bestNet) : undefined}
        imageUrl={bestNet?.crestUrl}
        to={teamPage(bestNet)}
      />
    </HeaderStats>
  );
}
