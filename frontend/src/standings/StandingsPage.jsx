import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams, useSearchParams } from "react-router";
import { getAdvancedStandings, getGameFlow, getPhaseResults, getPhases, getRounds, getSeasonStandings, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import CompetitionContext from "../lib/CompetitionContext";
import PageHeader from "../lib/PageHeader";
import { EASE_OUT } from "../lib/motion";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import { crossGroupQualifier, crossGroupQualifiers, tableTiers } from "../lib/seasonFormat";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { resultsByClub } from "./breakdownUtils";
import StandingsKpiStrip from "./StandingsKpiStrip";
import StandingsTable from "./StandingsTable";
import RaceView from "./RaceView";
import ViewSelect from "../lib/ViewSelect";
import AdvancedStandingsView from "./AdvancedStandingsView";
import { groupLabel, groupStandings, selectedGroup } from "./standingsGroups";

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

// The phone's View select: the view tabs, then the breakdowns after the overview.
const PHONE_VIEW_OPTIONS = [...VIEW_TABS, ...BREAKDOWN_TABS.filter((tab) => tab.key !== "overview")];

export default function StandingsPage() {
  useDocumentTitle("Standings");
  const { seasonCode } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState("overall");
  const [mode, setMode] = useState("table");
  const [breakdown, setBreakdown] = useState("overview");

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });

  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode] = usePhaseParam(phases);
  // The qualification lines of this phase's table, from the season's format (none while it loads or when it cannot be read).
  const formatQuery = useSeasonFormat(seasonCode);
  const format = formatQuery.data;
  const tiers = tableTiers(format, phaseCode);

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });

  // The short labels the tables show on a phone are the clubs' TV codes (then abbreviated names) from the teams list. The table
  // does not wait for it: until it arrives, or if it fails, the full names show.
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const shortNames = new Map(
    (teamsQuery.data?.teams ?? []).filter((team) => team.tvCode || team.abbreviatedName).map((team) => [team.clubCode, team.tvCode || team.abbreviatedName]),
  );

  const round = standingsQuery.data?.round ?? null;
  const standings = standingsQuery.data?.standings ?? [];
  const groups = useMemo(() => groupStandings(standingsQuery.data?.standings ?? []), [standingsQuery.data]);
  const stage = format?.stages.find((entry) => entry.code === phaseCode);
  const grouped = (stage?.plannedGroups ?? 0) > 1 || groups.length > 1 || (!stage && groups.some((group) => group.name === null)) || (formatQuery.isError && groups.some((group) => group.name !== null));
  const groupName = grouped ? selectedGroup(searchParams, groups) : null;
  const displayedGroups = grouped ? groups.filter((group) => groupName === null || group.name === groupName) : [{ name: null, standings }];
  const groupTiers = grouped ? tableTiers(format, phaseCode, "group") : null;
  const crossQualifiers = grouped ? crossGroupQualifiers(format, phaseCode, standings) : new Set();
  const destination = { TS: "Top 16", FF: "Final Four" }[stage?.qualification[0]?.to] ?? "Playoff";
  const crossQualifier = grouped ? crossGroupQualifier(format, phaseCode) : null;
  const groupTierLabels = { postseason: `${destination} places`, out: crossQualifier ? "Outside the group places (one sixth-placed club also qualified)" : "Outside qualification places" };
  const roundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, phaseCode],
    queryFn: () => getRounds(seasonCode, phaseCode),
    enabled: Boolean(phaseCode) && grouped && standings.length > 0,
  });
  const phaseRounds = roundsQuery.data?.rounds ?? [];
  const previousRound = phaseRounds.filter((entry) => entry.number < round).at(-1)?.number ?? null;
  const finalGroupSnapshot = stage?.dataState === "loaded" && phaseRounds.at(-1)?.number === round;

  useEffect(() => {
    if (!standingsQuery.isSuccess || !phaseCode || !searchParams.has("group")) return;
    if (grouped && selectedGroup(searchParams, groups) !== null) return;
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("group");
      return next;
    }, { replace: true });
  }, [standingsQuery.isSuccess, phaseCode, grouped, groups, searchParams, setSearchParams]);

  function setPhaseCode(code) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("phase", code);
      next.delete("group");
      return next;
    });
  }

  function setGroupName(name) {
    // Native type-ahead can emit repeated changes before the router state catches up.
    const current = new URLSearchParams(window.location.search);
    if (current.get("phase") === phaseCode && current.getAll("group").length < 2 && (current.get("group") || null) === (name || null)) return;
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("phase", phaseCode);
      if (name) next.set("group", name);
      else next.delete("group");
      return next;
    });
  }

  // The phase's advanced numbers (the phase code doubles as the scope, latest round) feed the Best net rating KPI
  // and the table's Net rtg column. Group KPIs receive only their own clubs' rows.
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
          phaseCode === "RS" || phaseCode === "TS" || stage?.type === "table" ? (
            <EmptyText>Standings not available yet for this phase.</EmptyText>
          ) : (
            // The play-in, playoffs and Final Four are knockouts: there is never a league table, whatever the state of the season.
            <EmptyText>
              This phase is a knockout, so it has no league table. The matchups and results are on the{" "}
              <Link to={`/${seasonCode}/postseason`} className="link link-primary">
                Postseason page
              </Link>
              , and every game is under Games.
            </EmptyText>
          )
        ) : (
          <div className="flex flex-col gap-4">
            {mode === "table" || (mode === "advanced" && format?.status === "cancelled") ? <CompetitionContext seasonCode={seasonCode} phaseCode={phaseCode} roundNumber={round} /> : null}
            {mode === "advanced" || grouped ? null : (
              <StandingsKpiStrip
                seasonCode={seasonCode}
                phaseCode={phaseCode}
                round={round}
                standings={standings}
                netQuery={netQuery}
                tiers={tiers}
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

            {grouped && mode !== "advanced" ? (
              <label className="flex w-fit max-w-full items-center gap-2 text-sm">
                Group
                <select aria-label="Group" className="select select-sm min-w-0" value={groupName ?? ""} onChange={(event) => setGroupName(event.target.value)}>
                  <option value="">All groups</option>
                  {groups.filter((group) => group.name !== null).map((group) => <option key={group.name} value={group.name}>{groupLabel(group.name)}</option>)}
                </select>
              </label>
            ) : null}
            {grouped && mode === "table" && roundsQuery.isError ? <AsyncState compact status="error" message="Round context is unavailable." onRetry={() => roundsQuery.refetch()} /> : null}

            {mode === "advanced" ? (
              <motion.div
                key="advanced-mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                <AdvancedStandingsView key={seasonCode} seasonCode={seasonCode} shortNames={shortNames} />
              </motion.div>
            ) : mode === "race" ? (
              displayedGroups.map((group, index) => (
                <section key={`${seasonCode}-${phaseCode}-${groupName ?? "all"}-${group.name}`} aria-label={grouped ? groupLabel(group.name) : undefined} className="flex min-w-0 flex-col gap-4">
                  {grouped ? <h2 className="text-lg font-semibold">{groupLabel(group.name)}</h2> : null}
                  {grouped && group.name === null ? <EmptyText>Group assignments are unavailable for these clubs.</EmptyText> : (
                    <RaceView
                      seasonCode={seasonCode}
                      phaseCode={phaseCode}
                      latestRound={round}
                      latestStandings={group.standings}
                      shortNames={shortNames}
                      tiers={grouped ? groupTiers : tiers}
                      groupName={grouped ? group.name : undefined}
                      tierLabels={grouped ? groupTierLabels : undefined}
                      stageName={grouped ? stage?.name ?? phaseCode : undefined}
                      showContext={index === 0}
                    />
                  )}
                </section>
              ))
            ) : (
              <motion.div
                key="table-mode"
                className="flex flex-col gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                {/* Below sm the four views and the three breakdowns are one list in one select (the view tabs were already hidden
                    whenever a breakdown was chosen, so they never applied together). */}
                <ViewSelect
                  className="sm:hidden"
                  label="View"
                  value={breakdown === "overview" ? view : breakdown}
                  options={PHONE_VIEW_OPTIONS}
                  onChange={(key) => {
                    if (VIEW_TABS.some((tab) => tab.key === key)) {
                      setBreakdown("overview");
                      setView(key);
                    } else {
                      setBreakdown(key);
                    }
                  }}
                />
                <div className="hidden flex-wrap items-center gap-3 sm:flex">
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
                  <label className="ms-2 flex items-center gap-2 text-xs text-base-content/70">
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

                <motion.div key={breakdown} className="flex flex-col gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                {displayedGroups.map((group) => {
                  if (grouped && group.name === null) return <section key="unavailable" aria-label="Group unavailable"><h2 className="text-lg font-semibold">Group unavailable</h2><EmptyText>Group assignments are unavailable for {group.standings.length} clubs.</EmptyText></section>;
                  const clubs = new Set(group.standings.map((row) => row.clubCode));
                  const scopedNet = grouped ? { ...netQuery, data: { ...netQuery.data, standings: (netQuery.data?.standings ?? []).filter((row) => clubs.has(row.clubCode)) } } : netQuery;
                  const rows = grouped ? group.standings.map((row) => ({ ...row, bestSixth: Boolean(finalGroupSnapshot && crossQualifiers.has(row.clubCode)), basic: row.basic ? { ...row.basic, qualified: Boolean(finalGroupSnapshot && (crossQualifiers.has(row.clubCode) || groupTiers?.some((tier) => row.basic.position >= tier.from && row.basic.position <= tier.to))) } : null })) : standings;
                  return (
                    <section key={group.name ?? "ungrouped"} aria-label={grouped ? groupLabel(group.name) : undefined} className="flex min-w-0 flex-col gap-4">
                      {grouped ? <>
                        <h2 className="text-lg font-semibold">{groupLabel(group.name)}</h2>
                        <StandingsKpiStrip seasonCode={seasonCode} phaseCode={phaseCode} round={round} previousRound={previousRound} standings={group.standings} netQuery={scopedNet} tiers={groupTiers} cutoffLabel={`${destination} cutoff`} />
                      </> : null}
                      <StandingsTable
                        standings={rows}
                        seasonCode={seasonCode}
                        view={view}
                        showTiers={grouped || phaseCode === "RS"}
                        showQualification={Boolean(format) && format.status !== "cancelled" && (!grouped || Boolean(finalGroupSnapshot && groupTiers))}
                        tiers={grouped ? groupTiers : tiers}
                        tierLabels={grouped ? groupTierLabels : undefined}
                        netByClub={netByClub}
                        shortNames={shortNames}
                        resultsQuery={resultsQuery}
                        resultsByClub={resultsByClub(resultsQuery.data)}
                        gameFlowQuery={gameFlowQuery}
                        breakdown={breakdown}
                      />
                    </section>
                  );
                })}
                </motion.div>
              </motion.div>
            )}
          </div>
        )}
      </TabPanel>
    </div>
  );
}
