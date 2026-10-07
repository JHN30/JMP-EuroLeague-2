import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getAdvancedStandings, getGameFlow, getPhaseResults, getPhases, getSeasonStandings, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import PageHeader from "../lib/PageHeader";
import { EASE_OUT } from "../lib/motion";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { resultsByClub } from "./breakdownUtils";
import StandingsKpiStrip from "./StandingsKpiStrip";
import StandingsTable from "./StandingsTable";
import RaceView from "./RaceView";
import AdvancedStandingsView from "./AdvancedStandingsView";

const VIEW_TABS = [
  { key: "overall", label: "Overall" },
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
  { key: "last10", label: "Last 10" },
];

const MODE_TABS = [
  { key: "table", label: "Table" },
  { key: "race", label: "Race" },
  { key: "advanced", label: "Advanced" },
];

const BREAKDOWN_TABS = [
  { key: "overview", label: "Overview" },
  { key: "streaks", label: "Streaks and form" },
  { key: "margins", label: "Winning margins" },
  { key: "aheadBehind", label: "Ahead/behind" },
];

export default function StandingsPage() {
  useDocumentTitle("Standings");
  const { seasonCode } = useParams();
  const [view, setView] = useState("overall");
  const [mode, setMode] = useState("table");
  const [breakdown, setBreakdown] = useState("overview");

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });

  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode, setPhaseCode] = usePhaseParam(phases);

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });

  // The short names the table shows on a phone come from the teams list (the standings carry only the full name). The table
  // does not wait for it: until it arrives, or if it fails, the full names show.
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const shortNames = new Map(
    (teamsQuery.data?.teams ?? []).filter((team) => team.abbreviatedName).map((team) => [team.clubCode, team.abbreviatedName]),
  );

  const round = standingsQuery.data?.round ?? null;
  const standings = standingsQuery.data?.standings ?? [];

  // The phase's advanced numbers (the phase code doubles as the scope, latest round) feed the Best net rating KPI
  // and the table's Net rtg column. Only regular-season standings exist so far; other phases show no table.
  const netQuery = useQuery({
    queryKey: ["advanced-standings-phase", seasonCode, phaseCode],
    queryFn: () => getAdvancedStandings(seasonCode, { scope: phaseCode }),
    enabled: Boolean(phaseCode) && standings.length > 0,
  });
  // The breakdowns work from each club's own results (and quarter scores): the ribbon, margin bars, form line and
  // quarter profile are all drawn or derived from them.
  const resultsQuery = useQuery({
    queryKey: ["phase-results", seasonCode, phaseCode],
    queryFn: () => getPhaseResults(seasonCode, phaseCode),
    enabled: Boolean(phaseCode) && standings.length > 0 && mode === "table" && breakdown !== "overview",
  });
  // Time spent in front comes from play-by-play, which the ahead/behind breakdown shows for the phase.
  const gameFlowQuery = useQuery({
    queryKey: ["game-flow", seasonCode, phaseCode],
    queryFn: () => getGameFlow(seasonCode, { scope: phaseCode }),
    enabled: Boolean(phaseCode) && standings.length > 0 && mode === "table" && breakdown === "aheadBehind",
  });
  const netByClub = new Map((netQuery.data?.standings ?? []).map((row) => [row.clubCode, row]));

  if (phasesQuery.isLoading) return <AsyncState status="loading" label="Loading phases" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader kicker="SEASON" title="Standings" />
      {mode === "advanced" ? null : (
        <TabStrip
          ariaLabel="Phase"

          level={1}
          panelId="standings-panel"
          activeKey={phaseCode}
          onChange={setPhaseCode}
          className="mb-4 w-fit"
          tabs={phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
        />
      )}

      <TabPanel id="standings-panel" focusKey={`${phaseCode}-${view}`} scroll={false}>
        {standingsQuery.isLoading ? (
          <AsyncState status="loading" label="Loading standings" />
        ) : standingsQuery.isError ? (
          <AsyncState status="error" message="Could not load standings." onRetry={() => standingsQuery.refetch()} />
        ) : standings.length === 0 ? (
          phaseCode === "RS" ? (
            <EmptyText>Standings not available yet for this phase.</EmptyText>
          ) : (
            // The play-in, playoffs and Final Four are knockouts: there is never a league table, whatever the state of the season.
            <EmptyText>
              This phase is a knockout, so it has no league table. The matchups and results are on the{" "}
              <Link to={`/${seasonCode}/playoffs`} className="link link-primary">
                Format page
              </Link>
              , and every game is under Games.
            </EmptyText>
          )
        ) : (
          <div className="flex flex-col gap-4">
            {mode === "advanced" ? null : (
              <StandingsKpiStrip
                seasonCode={seasonCode}
                phaseCode={phaseCode}
                round={round}
                standings={standings}
                netQuery={netQuery}
              />
            )}

            <TabStrip
              ariaLabel="Standings display"

              level={2}
              panelId="standings-panel"
              activeKey={mode}
              onChange={setMode}
              className="w-fit"
              tabs={MODE_TABS}
            />

            {mode === "advanced" ? (
              <motion.div
                key="advanced-mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                <AdvancedStandingsView key={seasonCode} seasonCode={seasonCode} />
              </motion.div>
            ) : mode === "race" ? (
              <RaceView
                key={`${seasonCode}-${phaseCode}`}
                seasonCode={seasonCode}
                phaseCode={phaseCode}
                latestRound={round}
                latestStandings={standings}
              />
            ) : (
              <motion.div
                key="table-mode"
                className="flex flex-col gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  {breakdown === "overview" ? (
                    <TabStrip
                      ariaLabel="Standings view"
                      panelId="standings-panel"
                      activeKey={view}
                      onChange={setView}
                      className="w-fit"
                      tabs={VIEW_TABS}
                    />
                  ) : null}
                  <label className="flex items-center gap-2 text-xs text-base-content/70">
                    Breakdown
                    <select
                      className="select select-sm select-bordered"
                      value={breakdown}
                      onChange={(event) => setBreakdown(event.target.value)}
                    >
                      {BREAKDOWN_TABS.map((tab) => (
                        <option key={tab.key} value={tab.key}>
                          {tab.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <motion.div key={breakdown} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                <StandingsTable
                  standings={standings}
                  seasonCode={seasonCode}
                  view={view}
                  showTiers={phaseCode === "RS"}
                  netByClub={netByClub}
                  shortNames={shortNames}
                  resultsQuery={resultsQuery}
                  resultsByClub={resultsByClub(resultsQuery.data)}
                  gameFlowQuery={gameFlowQuery}
                  breakdown={breakdown}
                />
                </motion.div>
              </motion.div>
            )}
          </div>
        )}
      </TabPanel>
    </div>
  );
}
