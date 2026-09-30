import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getRounds, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { sectionContainer, sectionItem } from "../lib/motion";
import RaceChart from "./RaceChart";
import RacePlayback from "./RacePlayback";
import RaceInsightCards from "./RaceInsightCards";
import RaceSnapshotTable from "./RaceSnapshotTable";

function combineSnapshots(results) {
  return {
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
    data: results.map((result) => result.data),
  };
}

// `latestRound` is the last round with standings. The phase lists every scheduled round, but only the played ones
// have a snapshot, so the race stops there instead of running to the end of the schedule.
export default function RaceView({ seasonCode, phaseCode, latestRound, latestStandings }) {
  const roundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, phaseCode],
    queryFn: () => getRounds(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });

  const playedRounds = useMemo(
    () =>
      (roundsQuery.data?.rounds ?? [])
        .map((r) => r.number)
        .filter((number) => latestRound != null && number <= latestRound)
        .sort((a, b) => a - b),
    [roundsQuery.data, latestRound],
  );

  const snapshots = useQueries({
    queries: playedRounds.map((roundNumber) => ({
      queryKey: ["standings", seasonCode, phaseCode, "round", roundNumber],
      queryFn: () => getSeasonStandings(seasonCode, phaseCode, { round: roundNumber }),
    })),
    combine: combineSnapshots,
  });

  const isLoading = roundsQuery.isLoading || snapshots.isLoading;
  const isError = roundsQuery.isError || snapshots.isError;

  // Each round's snapshot: where every club stood and its record at that point.
  const { rounds, positionsByRound, recordsByRound } = useMemo(() => {
    const played = [];
    const positions = new Map();
    const records = new Map();
    playedRounds.forEach((roundNumber, index) => {
      const data = snapshots.data[index];
      if (!data || data.standings.length === 0) return;
      const roundPositions = new Map();
      const roundRecords = new Map();
      for (const entry of data.standings) {
        if (entry.basic?.position == null) continue;
        roundPositions.set(entry.clubCode, entry.basic.position);
        roundRecords.set(entry.clubCode, { won: entry.basic.gamesWon, lost: entry.basic.gamesLost });
      }
      played.push(roundNumber);
      positions.set(roundNumber, roundPositions);
      records.set(roundNumber, roundRecords);
    });
    return { rounds: played, positionsByRound: positions, recordsByRound: records };
  }, [playedRounds, snapshots.data]);

  const teamOrder = useMemo(
    () =>
      [...latestStandings]
        .filter((entry) => entry.basic?.position != null)
        .sort((a, b) => a.basic.position - b.basic.position)
        .map((entry) => ({
          clubCode: entry.clubCode,
          clubName: entry.clubName,
          clubTvCode: entry.clubTvCode,
          crestUrl: entry.crestUrl,
        })),
    [latestStandings],
  );

  // How many rounds the race has replayed: 0 is the season start (everyone 0-0), the last step is the latest round.
  // Until somebody touches the slider or plays it, the race shows the latest standings.
  const [step, setStep] = useState(null);
  const [focusedClub, setFocusedClub] = useState(null);

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

  const shown = Math.min(step ?? rounds.length, rounds.length);
  const shownRound = shown > 0 ? rounds[shown - 1] : null;
  const previousRound = shown > 1 ? rounds[shown - 2] : null;

  return (
    <motion.div className="flex flex-col gap-3" variants={sectionContainer} initial="hidden" animate="show">
      <motion.div variants={sectionItem}>
      <RaceInsightCards
        seasonCode={seasonCode}
        rounds={rounds.slice(0, shown)}
        standingsByRound={positionsByRound}
        teamOrder={teamOrder}
      />
      </motion.div>

      <motion.div variants={sectionItem} className="legend flex flex-wrap gap-4 text-xs text-base-content/70">
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
      </motion.div>

      <motion.div variants={sectionItem}>
      <RacePlayback
        total={rounds.length}
        value={shown}
        label={shownRound == null ? "Season start" : `Round ${shownRound}`}
        endLabel={`Round ${rounds[rounds.length - 1]}`}
        onChange={setStep}
      />
      </motion.div>

      <motion.div variants={sectionItem} className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
        <RaceChart
          rounds={rounds}
          visibleCount={shown}
          standingsByRound={positionsByRound}
          teamOrder={teamOrder}
          focusedClub={focusedClub}
          onFocusClub={setFocusedClub}
        />
        <RaceSnapshotTable
          seasonCode={seasonCode}
          round={shownRound}
          previousRound={previousRound}
          positionsByRound={positionsByRound}
          recordsByRound={recordsByRound}
          teamOrder={teamOrder}
          focusedClub={focusedClub}
          onFocusClub={setFocusedClub}
        />
      </motion.div>
    </motion.div>
  );
}
