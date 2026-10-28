import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams, useSearchParams } from "react-router";
import { getPhases, getRounds, getSeasonGames, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import GamesSkeleton, { FixturesSkeleton } from "./GamesSkeleton";
import EmptyText from "../lib/EmptyText";
import CompetitionContext from "../lib/CompetitionContext";
import LabelledSelect from "../lib/LabelledSelect";
import PageHeader from "../lib/PageHeader";
import { useCentredSelection } from "../lib/useCentredSelection";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { listContainer } from "../lib/motion";
import { usePhaseParam } from "../lib/usePhaseParam";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { groupedStageCodes } from "../lib/seasonFormat";
import { groupLabel, groupStandings, selectedGroup } from "../standings/standingsGroups";
import { ELIMINATION_STAGES, eliminationStageLabel, eliminationStageOf } from "../postseason/eliminationBracket";
import GameCard from "./GameCard";

// A round never holds more than a handful of games; this is the API's page cap.
const ROUND_GAME_LIMIT = 100;

export default function FixturesPage() {
  useDocumentTitle("Games");
  const { seasonCode } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const roundStripRef = useRef(null);

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode] = usePhaseParam(phases);

  // The original elimination tournament's knockout is browsed by stage: the source's round numbers ("Game 1" to "Game 8") mix its stages.
  const formatQuery = useSeasonFormat(seasonCode);
  const stageMode = formatQuery.data?.family === "eliminationSeries" && phaseCode === "PO";
  const roundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, phaseCode],
    queryFn: () => getRounds(seasonCode, phaseCode),
    enabled: Boolean(phaseCode) && !stageMode && !formatQuery.isLoading,
  });
  const rounds = roundsQuery.data?.rounds ?? [];

  // With no round in the URL, open on the round that has the next game to play, or the last round once the phase is over.
  const nextGameQuery = useQuery({
    queryKey: ["fixtures-next", seasonCode, phaseCode],
    queryFn: () => getSeasonGames(seasonCode, { phase: phaseCode, status: "scheduled", order: "asc", limit: 1 }),
    enabled: Boolean(phaseCode) && !stageMode && !formatQuery.isLoading,
  });
  const defaultRound = nextGameQuery.data?.games[0]?.roundNumber ?? rounds.at(-1)?.number ?? null;

  const requestedRound = Number(searchParams.get("round"));
  const selectedRound = rounds.some((round) => round.number === requestedRound) ? requestedRound : defaultRound;
  const selectedIndex = rounds.findIndex((round) => round.number === selectedRound);

  const gamesQuery = useQuery({
    queryKey: ["fixtures", seasonCode, phaseCode, selectedRound],
    queryFn: () => getSeasonGames(seasonCode, { phase: phaseCode, round: selectedRound, limit: ROUND_GAME_LIMIT, order: "asc" }),
    enabled: Boolean(phaseCode) && selectedRound !== null,
  });
  // A grouped table stage (the regular season and Top 16 of E2012-E2015) shows each club's record in that stage and a group
  // filter; every other phase keeps the regular-season record under the clubs.
  const format = formatQuery.data ?? null;
  const stageGamesQuery = useQuery({
    queryKey: ["fixtures-stages", seasonCode, phaseCode],
    queryFn: () => getSeasonGames(seasonCode, { phase: phaseCode, limit: ROUND_GAME_LIMIT, order: "asc" }),
    enabled: stageMode,
  });
  const stageGames = stageGamesQuery.data?.games ?? [];
  const stages = [
    ...ELIMINATION_STAGES.map((stage, index) => ({ key: stage.id, name: stage.name, games: stageGames.filter((game) => eliminationStageOf(game.groupName) === index) })),
    { key: "other", name: "Other games", games: stageGames.filter((game) => eliminationStageOf(game.groupName) === -1) },
  ].filter((stage) => stage.games.length > 0);
  // With no stage in the URL, open on the first stage that still has a game to play, or the last stage once the knockout is over.
  const requestedStage = searchParams.get("stage");
  const defaultStage = stages.find((stage) => stage.games.some((game) => !game.played))?.key ?? stages.at(-1)?.key ?? null;
  const selectedStage = stages.some((stage) => stage.key === requestedStage) ? requestedStage : defaultStage;
  const groupedStages = groupedStageCodes(format);
  const groupedPhase = groupedStages.has(phaseCode);
  const recordPhaseCode = groupedPhase ? phaseCode : "RS";
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, recordPhaseCode],
    queryFn: () => getSeasonStandings(seasonCode, recordPhaseCode),
  });
  // The record under each club is its record as it stands now (final once the season is over), the same on every round, as on
  // the league's own site; how the season unfolded round by round is on the Standings race view. The query is the dashboard's.
  const standingByClubCode = new Map(
    phaseCode === "RS" || groupedPhase ? (standingsQuery.data?.standings ?? []).map((entry) => [entry.clubCode, entry]) : [],
  );
  const groups = groupedPhase ? groupStandings(standingsQuery.data?.standings ?? []).filter((group) => group.name !== null) : [];
  const groupName = groups.length > 1 ? selectedGroup(searchParams, groups) : null;
  // An empty upcoming schedule alone does not establish completion.
  const seasonOver = format
    ? format.status === "completed" || format.status === "cancelled"
    : false;

  // A group that is not in this phase's table is dropped from the address once the table has loaded.
  useEffect(() => {
    if (!standingsQuery.isSuccess || !searchParams.has("group") || groupName !== null) return;
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("group");
      return next;
    }, { replace: true });
  }, [standingsQuery.isSuccess, searchParams, groupName, setSearchParams]);

  const allGames = stageMode ? (stages.find((stage) => stage.key === selectedStage)?.games ?? []) : (gamesQuery.data?.games ?? []);
  const games = groupName === null ? allGames : allGames.filter((game) => game.groupName === groupLabel(groupName));
  const isResolvingRound = formatQuery.isLoading || (stageMode ? stageGamesQuery.isLoading : roundsQuery.isLoading || nextGameQuery.isLoading);

  // Keep the selected round visible in the scrolling strip, also when the strip changes width (a phone turned sideways).
  useCentredSelection(roundStripRef, `${selectedRound}:${rounds.length}`);

  function selectRound(number) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("round", String(number));
      return next;
    });
  }

  function selectStage(key) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("stage", key);
      return next;
    });
  }

  function handlePhaseChange(code) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (code) next.set("phase", code); else next.delete("phase");
      next.delete("round");
      next.delete("stage");
      next.delete("group");
      return next;
    });
  }

  function selectGroup(name) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (name) next.set("group", name); else next.delete("group");
      return next;
    });
  }

  if (phasesQuery.isLoading) return <AsyncState status="loading" label="Loading phases" skeleton={<GamesSkeleton />} />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader kicker="SCHEDULE" title="Games" />
      <CompetitionContext seasonCode={seasonCode} phaseCode={phaseCode} roundNumber={stageMode ? null : selectedRound} />

      <TabStrip
        ariaLabel="Phase"

        level={1}
        panelId="fixtures-panel"
        activeKey={phaseCode}
        onChange={handlePhaseChange}
        className="mb-2 w-fit sm:mb-4"
        tabs={phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
      />

      {stageMode && stages.length > 0 ? (
        <TabStrip
          ariaLabel="Stage"
          panelId="fixtures-panel"
          activeKey={selectedStage}
          onChange={selectStage}
          className="mb-2 w-fit max-w-full sm:mb-6"
          tabs={stages.map((stage) => ({ key: stage.key, label: `${stage.name} (${stage.games.length})` }))}
        />
      ) : null}

      {!stageMode && rounds.length > 0 ? (
        <div className="mb-2 flex items-center gap-1 sm:mb-6 sm:gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            className="btn btn-sm btn-square btn-ghost text-xl leading-none"
            aria-label="Previous round"
            disabled={selectedIndex <= 0}
            onClick={() => selectRound(rounds[selectedIndex - 1].number)}
          >
            ‹
          </motion.button>
          <div ref={roundStripRef} className="round-strip">
            <TabStrip
              ariaLabel="Round"
              panelId="fixtures-panel"
              activeKey={selectedRound}
              onChange={selectRound}
              className="w-max flex-nowrap"
              tabs={rounds.map((round) => ({
                key: round.number,
                label: (
                  <>
                    {round.number === selectedRound ? (
                      <motion.span
                        layoutId="round-indicator"
                        className="round-indicator"
                        transition={{ type: "spring", stiffness: 500, damping: 36 }}
                      />
                    ) : null}
                    {round.name ?? `Round ${round.number}`}
                  </>
                ),
              }))}
            />
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            className="btn btn-sm btn-square btn-ghost text-xl leading-none"
            aria-label="Next round"
            disabled={selectedIndex === -1 || selectedIndex >= rounds.length - 1}
            onClick={() => selectRound(rounds[selectedIndex + 1].number)}
          >
            ›
          </motion.button>
        </div>
      ) : null}

      {groups.length > 1 ? (
        <div className="mb-3 sm:mb-4">
          <LabelledSelect label="Group" value={groupName ?? ""} onChange={(event) => selectGroup(event.target.value)} className="min-w-0">
            <option value="">All groups</option>
            {groups.map((group) => <option key={group.name} value={group.name}>{groupLabel(group.name)}</option>)}
          </LabelledSelect>
        </div>
      ) : null}

      <TabPanel id="fixtures-panel" focusKey={`${phaseCode}-${stageMode ? selectedStage : selectedRound}`} scroll={false}>
        {isResolvingRound || (!stageMode && gamesQuery.isLoading) ? (
          <AsyncState status="loading" label="Loading games" skeleton={<FixturesSkeleton />} />
        ) : (stageMode ? stageGamesQuery.isError : roundsQuery.isError || gamesQuery.isError) ? (
          <AsyncState
            status="error"
            message="Could not load games."
            onRetry={() => {
              roundsQuery.refetch();
              gamesQuery.refetch();
              stageGamesQuery.refetch();
            }}
          />
        ) : games.length === 0 ? (
          <EmptyText>{stageMode ? "No games in this stage yet." : "No games in this round yet."}</EmptyText>
        ) : (
          <div className="fixture-box">
            {(phaseCode === "RS" || groupedPhase) && standingByClubCode.size > 0 ? (
              <p className="muted mb-3 text-xs">
                {groupedPhase
                  ? `The record under each club is its ${seasonOver ? "final " : ""}record in its ${format.stages.find((stage) => stage.code === phaseCode)?.name ?? "stage"} group${seasonOver ? "" : " so far"}.`
                  : format?.status === "cancelled" ? "The record under each club is its regular-season record at suspension." : seasonOver ? "The record under each club is its final regular-season record." : "The record under each club is its regular-season record so far."}
              </p>
            ) : null}
            <motion.div
              key={`${phaseCode}-${stageMode ? selectedStage : selectedRound}`}
              className="fixture-grid"
              variants={listContainer}
              initial="hidden"
              animate="show"
            >
              {games.map((game) => (
                <GameCard
                  key={game.gameCode}
                  game={game}
                  seasonCode={seasonCode}
                  cancelled={format?.status === "cancelled"}
                  showGroup={groupedPhase}
                  caption={stageMode ? eliminationStageLabel(format, game) : null}
                  standingByClubCode={standingByClubCode}
                />
              ))}
            </motion.div>
          </div>
        )}
      </TabPanel>
    </div>
  );
}
