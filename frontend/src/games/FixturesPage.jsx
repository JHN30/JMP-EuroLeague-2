import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams, useSearchParams } from "react-router";
import { getPhases, getRounds, getSeasonGames, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { listContainer } from "../lib/motion";
import { usePhaseParam } from "../lib/usePhaseParam";
import { TabPanel, TabStrip } from "../lib/TabStrip";
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

  const roundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, phaseCode],
    queryFn: () => getRounds(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });
  const rounds = roundsQuery.data?.rounds ?? [];

  // With no round in the URL, open on the round that has the next game to play, or the last round once the phase is over.
  const nextGameQuery = useQuery({
    queryKey: ["fixtures-next", seasonCode, phaseCode],
    queryFn: () => getSeasonGames(seasonCode, { phase: phaseCode, status: "scheduled", order: "asc", limit: 1 }),
    enabled: Boolean(phaseCode),
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
  // Same query the dashboard uses, so the records match and are usually already cached.
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  // The record under each club is its regular-season record as it stands now (final once the season is over), the same on
  // every round, as on the league's own site; how the season unfolded round by round is on the Standings race view.
  const standingByClubCode = new Map(
    phaseCode === "RS" ? (standingsQuery.data?.standings ?? []).map((entry) => [entry.clubCode, entry]) : [],
  );
  const seasonOver = (standingsQuery.data?.standings ?? []).length > 0 && !(nextGameQuery.data?.games.length > 0);

  const games = gamesQuery.data?.games ?? [];
  const isResolvingRound = roundsQuery.isLoading || nextGameQuery.isLoading;

  // Keep the selected round visible in the scrolling strip. Scrolls the strip itself, never the page.
  useEffect(() => {
    const strip = roundStripRef.current;
    const active = strip?.querySelector('[aria-selected="true"]');
    if (!strip || !active) return;
    strip.scrollTo({ left: active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2, behavior: "smooth" });
  }, [selectedRound, rounds.length]);

  function selectRound(number) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("round", String(number));
      return next;
    });
  }

  function handlePhaseChange(code) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (code) next.set("phase", code); else next.delete("phase");
      next.delete("round");
      return next;
    });
  }

  if (phasesQuery.isLoading) return <AsyncState status="loading" label="Loading phases" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader kicker="SCHEDULE" title="Games" />

      <TabStrip
        ariaLabel="Phase"
        panelId="fixtures-panel"
        activeKey={phaseCode}
        onChange={handlePhaseChange}
        className="mb-4 w-fit"
        tabs={phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
      />

      {rounds.length > 0 ? (
        <div className="mb-6 flex items-center gap-2">
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

      <TabPanel id="fixtures-panel" focusKey={`${phaseCode}-${selectedRound}`} scroll={false}>
        {isResolvingRound || gamesQuery.isLoading ? (
          <AsyncState status="loading" label="Loading games" />
        ) : roundsQuery.isError || gamesQuery.isError ? (
          <AsyncState
            status="error"
            message="Could not load games."
            onRetry={() => {
              roundsQuery.refetch();
              gamesQuery.refetch();
            }}
          />
        ) : games.length === 0 ? (
          <EmptyText>No games in this round yet.</EmptyText>
        ) : (
          <div className="fixture-box">
            {phaseCode === "RS" && standingByClubCode.size > 0 ? (
              <p className="muted mb-3 text-xs">
                {seasonOver ? "The record under each club is its final regular-season record." : "The record under each club is its regular-season record so far."}
              </p>
            ) : null}
            <motion.div
              key={`${phaseCode}-${selectedRound}`}
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
