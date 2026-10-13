import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getRounds, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import CompetitionContext from "../lib/CompetitionContext";
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
export default function RaceView({ seasonCode, phaseCode, latestRound, latestStandings, shortNames, tiers = null, groupName, tierLabels, stageName }) {
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
        if (groupName !== undefined && entry.groupName !== groupName) continue;
        if (entry.basic?.position == null) continue;
        roundPositions.set(entry.clubCode, entry.basic.position);
        roundRecords.set(entry.clubCode, { won: entry.basic.gamesWon, lost: entry.basic.gamesLost });
      }
      if (roundPositions.size === 0) return;
      played.push(roundNumber);
      positions.set(roundNumber, roundPositions);
      records.set(roundNumber, roundRecords);
    });
    return { rounds: played, positionsByRound: positions, recordsByRound: records };
  }, [playedRounds, snapshots.data, groupName]);

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
  const roundNames = new Map((roundsQuery.data?.rounds ?? []).map((entry) => [entry.number, entry.name]));
  const roundLabel = (number) => stageName ? `${stageName}: ${roundNames.get(number) ?? "Round name unavailable"}` : `Round ${number}`;
  const startLabel = stageName ? `${stageName} start` : "Season start";

  return (
    <motion.div className="flex flex-col gap-3" variants={sectionContainer} initial="hidden" animate="show">
      <motion.div variants={sectionItem}>
      <RaceInsightCards
        seasonCode={seasonCode}
        rounds={rounds.slice(0, shown)}
        standingsByRound={positionsByRound}
        teamOrder={teamOrder}
        tiers={tiers}
      />
      </motion.div>

      {tiers ? (
        <motion.div variants={sectionItem} className="legend flex flex-wrap gap-4 text-xs text-base-content/70">
          {tiers.map((line) => (
            <span key={line.tier} className="inline-flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: `color-mix(in srgb, var(--color-${line.tier === "playin" ? "warning" : "success"}) 25%, transparent)` }}
              />
              {tierLabels?.[line.tier] ?? (line.tier === "playin" ? "Play-in tournament" : "Direct to playoffs")} ({line.from}-{line.to})
            </span>
          ))}
        </motion.div>
      ) : null}

      <motion.div variants={sectionItem}>
      <RacePlayback
        total={rounds.length}
        value={shown}
        label={shownRound == null ? startLabel : roundLabel(shownRound)}
        endLabel={roundLabel(rounds[rounds.length - 1])}
        startLabel={stageName ? startLabel : undefined}
        stageName={stageName}
        onChange={setStep}
      />
      </motion.div>
      <CompetitionContext seasonCode={seasonCode} phaseCode={phaseCode} roundNumber={shownRound} />

      <motion.div variants={sectionItem} className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[2fr_1fr]">
        <RaceChart
          rounds={rounds}
          visibleCount={shown}
          standingsByRound={positionsByRound}
          teamOrder={teamOrder}
          focusedClub={focusedClub}
          onFocusClub={setFocusedClub}
          tiers={tiers}
          roundLabel={stageName ? roundLabel : undefined}
        />
        <RaceSnapshotTable
          seasonCode={seasonCode}
          round={shownRound}
          previousRound={previousRound}
          positionsByRound={positionsByRound}
          recordsByRound={recordsByRound}
          teamOrder={teamOrder}
          shortNames={shortNames}
          focusedClub={focusedClub}
          onFocusClub={setFocusedClub}
          tiers={tiers}
          roundLabel={stageName ? roundLabel(shownRound) : undefined}
          startLabel={startLabel}
        />
      </motion.div>
    </motion.div>
  );
}
