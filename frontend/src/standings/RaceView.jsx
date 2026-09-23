import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getRounds, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import RaceChart from "./RaceChart";
import RacePlayback from "./RacePlayback";
import RaceInsightCards from "./RaceInsightCards";
import RaceSnapshotTable from "./RaceSnapshotTable";

export default function RaceView({ seasonCode, phaseCode, latestStandings }) {
  const roundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, phaseCode],
    queryFn: () => getRounds(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });

  const rounds = useMemo(
    () => (roundsQuery.data?.rounds ?? []).map((r) => r.number).sort((a, b) => a - b),
    [roundsQuery.data],
  );

  const roundQueries = useQueries({
    queries: rounds.map((roundNumber) => ({
      queryKey: ["standings", seasonCode, phaseCode, "round", roundNumber],
      queryFn: () => getSeasonStandings(seasonCode, phaseCode, { round: roundNumber }),
      enabled: rounds.length > 0,
    })),
  });

  const isLoading = roundsQuery.isLoading || roundQueries.some((q) => q.isLoading);
  const isError = roundsQuery.isError || roundQueries.some((q) => q.isError);

  const standingsByRound = useMemo(() => {
    const map = new Map();
    rounds.forEach((roundNumber, index) => {
      const data = roundQueries[index]?.data;
      if (!data) return;
      const positions = new Map();
      for (const entry of data.standings) {
        if (entry.basic?.position != null) positions.set(entry.clubCode, entry.basic.position);
      }
      map.set(roundNumber, positions);
    });
    return map;
  }, [rounds, roundQueries]);

  const teamOrder = useMemo(
    () =>
      [...latestStandings]
        .filter((entry) => entry.basic?.position != null)
        .sort((a, b) => a.basic.position - b.basic.position)
        .map((entry) => ({ clubCode: entry.clubCode, clubName: entry.clubName, clubTvCode: entry.clubTvCode })),
    [latestStandings],
  );

  const latestByCode = useMemo(() => new Map(latestStandings.map((entry) => [entry.clubCode, entry])), [latestStandings]);

  const [visibleCount, setVisibleCount] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [focusedClub, setFocusedClub] = useState(null);

  const visibleRounds = useMemo(() => rounds.slice(0, visibleCount), [rounds, visibleCount]);

  if (isLoading) return <AsyncState status="loading" label="Loading standings race" />;
  if (isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load round-by-round standings."
        onRetry={() => roundsQuery.refetch()}
      />
    );
  }
  if (rounds.length < 2) {
    return <EmptyText>Not enough rounds played yet to replay the standings race.</EmptyText>;
  }

  return (
    <div className="flex flex-col gap-3">
      <RaceInsightCards
        seasonCode={seasonCode}
        rounds={rounds}
        standingsByRound={standingsByRound}
        teamOrder={teamOrder}
      />

      <div className="legend flex flex-wrap gap-4 text-xs text-base-content/70">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: "color-mix(in srgb, var(--color-success) 25%, transparent)" }}
          />
          Direct to playoffs (1-6)
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: "color-mix(in srgb, var(--color-warning) 25%, transparent)" }}
          />
          Play-in tournament (7-10)
        </span>
      </div>

      <RacePlayback
        roundCount={rounds.length}
        visibleCount={visibleCount}
        onChange={setVisibleCount}
        playing={playing}
        onPlayingChange={setPlaying}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
        <RaceChart
          rounds={visibleRounds}
          totalRounds={rounds.length}
          standingsByRound={standingsByRound}
          teamOrder={teamOrder}
          focusedClub={focusedClub}
          onFocusClub={setFocusedClub}
        />
        <RaceSnapshotTable
          seasonCode={seasonCode}
          rounds={rounds}
          standingsByRound={standingsByRound}
          teamOrder={teamOrder}
          latestByCode={latestByCode}
          focusedClub={focusedClub}
          onFocusClub={setFocusedClub}
        />
      </div>

      <p className="text-xs text-base-content/55">
        The race chart replays position from historical per-round standings snapshots. The table above remains the
        authoritative current standings.
      </p>
    </div>
  );
}
