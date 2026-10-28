import { motion } from "motion/react";
import AsyncState from "../lib/AsyncState";
import { BoardSkeleton } from "./LeadersSkeleton";
import EmptyText from "../lib/EmptyText";
import FilterDisclosure from "../games/FilterDisclosure";
import LabelledSelect from "../lib/LabelledSelect";
import { listContainer } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import SearchField from "../lib/SearchField";
import { Avatar, BoardHeader, BoardRow, BoardTopLine, CardGrid, CategoryCard, LeadersToolbar, ModeToggle, StatSelect } from "./LeaderParts";
import { advancedScopeForPhase } from "../teams/teamLeague";
import { barShare, rankRows } from "./leaderData";
import ForfeitStatsNote from "../lib/ForfeitStatsNote";
import { LEADER_STATS, TEAM_CARDS, TEAM_SECTION_NAMES, TEAM_TOTAL_CARDS, formatTeamValue, leaderStatByKey, useTeamRows, usable, UNADJUSTED_NOTE } from "./teamData";

// ---- Landing ----

function TeamCard({ stat, seasonCode, rows, mode, onOpen, isLoading, isError, onRetry }) {
  const direction = stat.lowerIsBetter ? 1 : -1;
  const valued = rows.map((row) => ({ row, value: stat.get(row, mode) })).filter((entry) => entry.value !== null && !Number.isNaN(entry.value));
  valued.sort((a, b) => direction * (a.value - b.value));
  const ranked = rankRows(valued.slice(0, 5), (entry) => entry.value);
  const best = ranked[0]?.value ?? null;
  const worst = ranked.length ? ranked[ranked.length - 1].value : 0;
  return (
    <CategoryCard
      kicker={stat.family.toUpperCase()}
      title={stat.label}
      tip={stat.tip}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      onOpen={onOpen}
      entries={ranked.map(({ row: { row }, rank, value }) => ({
        key: row.clubCode,
        rank,
        name: row.name,
        imageUrl: row.crestUrl,
        crest: true,
        to: `/${seasonCode}/teams/${row.clubCode}`,
        team: { code: row.standing?.basic ? `${row.standing.basic.gamesWon}-${row.standing.basic.gamesLost}` : null },
        valueText: formatTeamValue(stat, value, mode),
        share: barShare(value, stat.lowerIsBetter ? worst : best, stat.lowerIsBetter ? best : Math.min(worst, 0)),
      }))}
    />
  );
}

// ---- The full board ----

const PAGE_SIZE = 25;

function TeamsBoard({ seasonCode, phaseCode, stage, metric, source, params, setParams }) {
  const stat = leaderStatByKey(metric) ?? LEADER_STATS[0];
  const mode = params.get("mode") === "accumulated" ? "accumulated" : "perGame";
  const direction = params.get("direction") ?? (stat.lowerIsBetter ? "asc" : "desc");
  const search = params.get("search") ?? "";
  const sign = direction === "asc" ? 1 : -1;

  const valued = source.rows.map((row) => ({ row, value: stat.get(row, mode) })).filter((entry) => entry.value !== null && !Number.isNaN(entry.value));
  valued.sort((a, b) => sign * (a.value - b.value));
  const ranked = rankRows(valued, (entry) => entry.value);
  const shown = ranked.filter(({ row: { row } }) => !search || row.name.toLowerCase().includes(search.toLowerCase()));
  const best = ranked[0]?.value ?? null;
  const last = ranked.length ? ranked[ranked.length - 1].value : 0;
  const top = sign === 1 ? last : best;
  const bottom = sign === 1 ? best : Math.min(last, 0);
  const hasMode = stat.kind === "count" || stat.totals;

  function update(patch) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    });
  }

  const families = TEAM_SECTION_NAMES.filter((entry) => LEADER_STATS.some((candidate) => candidate.family === entry && usable(candidate, source)));
  const chooseStat = (key) => update({ metric: key, direction: undefined, offset: undefined });
  const setMode = (key) => update({ mode: key === "perGame" ? undefined : key });

  return (
    <div className="flex flex-col gap-4">
      <LeadersToolbar>
        {stage}
        <StatSelect families={families} stats={LEADER_STATS.filter((entry) => usable(entry, source))} activeKey={stat.key} onChoose={chooseStat} />
        {hasMode ? <ModeToggle ariaLabel="Team statistics mode" mode={mode} onChange={setMode} /> : null}
      </LeadersToolbar>
      <BoardTopLine>
        <p className="muted text-sm">{hasMode ? (mode === "perGame" ? "Per game" : "Season totals") : "Whole phase"} · overtime counted</p>
      </BoardTopLine>
      {source.unadjusted ? <p className="muted text-sm">{UNADJUSTED_NOTE}</p> : null}
      <ForfeitStatsNote seasonCode={seasonCode} phaseCode={phaseCode} />
      <div className="grid grid-cols-2 items-end gap-3 max-sm:[&_select]:w-full sm:flex sm:flex-wrap">
        <LabelledSelect label="Order" ariaLabel="Team sort direction" value={direction} onChange={(event) => update({ direction: event.target.value })}>
          <option value="desc">Highest first</option>
          <option value="asc">Lowest first</option>
        </LabelledSelect>
        <FilterDisclosure activeCount={search ? 1 : 0} className="col-span-2 sm:contents" gridClassName="sm:contents">
          <SearchField label="Search teams by name" placeholder="Search teams..." value={search} onChange={(event) => update({ search: event.target.value || undefined })} />
        </FilterDisclosure>
      </div>
      {source.isLoading ? (
        <AsyncState status="loading" label="Loading the team leaderboard" skeleton={<BoardSkeleton />} />
      ) : source.isError ? (
        <AsyncState status="error" message="Could not load the team leaderboard." onRetry={source.refetch} />
      ) : shown.length === 0 ? (
        <EmptyText>No teams match.</EmptyText>
      ) : (
        <Panel className="p-2 sm:p-3">
          <BoardHeader columns={["GP", "Record"]} valueLabel={stat.short} />
          <motion.ol variants={listContainer} initial="hidden" animate="show" key={`${stat.key}-${mode}-${direction}-${search}`}>
            {shown.slice(0, PAGE_SIZE).map(({ row: { row }, rank, value }) => (
              <BoardRow
                key={row.clubCode}
                rank={rank}
                avatar={<Avatar imageUrl={row.crestUrl} crest />}
                name={row.name}
                columns={[
                  { label: "Games played", value: row.gp },
                  { label: "Record", value: row.standing?.basic ? `${row.standing.basic.gamesWon}-${row.standing.basic.gamesLost}` : "—" },
                ]}
                valueText={formatTeamValue(stat, value, mode)}
                share={barShare(value, top, bottom)}
                to={`/${seasonCode}/teams/${row.clubCode}`}
              />
            ))}
          </motion.ol>
        </Panel>
      )}
    </div>
  );
}

export default function TeamsLeaders({ seasonCode, phaseCode, stage, params, setParams }) {
  const metric = params.get("metric");
  const mode = params.get("mode") === "accumulated" ? "accumulated" : "perGame";
  const setMode = (key) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (key === "perGame") next.delete("mode");
      else next.set("mode", key);
      return next;
    });
  const source = useTeamRows(seasonCode, phaseCode);
  // Opening a category swaps the page's view on one path (only `?metric=` changes), so ScrollToTop does not run: the page goes to the top
  // by itself. Going back to the categories does the same, from the page's back link (LeadersPage).
  const openMetric = (key) => {
    window.scrollTo(0, 0);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("metric", key);
      return next;
    });
  };

  if (metric) return <TeamsBoard seasonCode={seasonCode} phaseCode={phaseCode} stage={stage} metric={metric} source={source} params={params} setParams={setParams} />;
  if (source.isError) return <AsyncState status="error" message="Could not load the team leaderboard." onRetry={source.refetch} />;
  return (
    <div className="flex flex-col gap-8">
      <LeadersToolbar>
        {stage}
        <ModeToggle ariaLabel="Team statistics mode" mode={mode} onChange={setMode} />
      </LeadersToolbar>
      {source.unadjusted ? <p className="muted text-sm">{UNADJUSTED_NOTE}</p> : null}
      <ForfeitStatsNote seasonCode={seasonCode} phaseCode={phaseCode} />
      {advancedScopeForPhase(phaseCode) === "PS" ? (
        <p className="muted text-sm">Ratings for the play-in, playoffs and Final Four cover the whole postseason together.</p>
      ) : null}
      {TEAM_SECTION_NAMES.map((family) => {
        const stats = (mode === "accumulated" ? TEAM_TOTAL_CARDS : TEAM_CARDS).map((key) => leaderStatByKey(key)).filter((stat) => stat.family === family && usable(stat, source));
        if (stats.length === 0) return null;
        return (
          <section key={family} className="flex flex-col gap-4" aria-label={family}>
            <PanelHeader title={family} />
            <CardGrid>
              {stats.map((stat) => (
                <TeamCard key={stat.key} stat={stat} seasonCode={seasonCode} rows={source.rows} mode={mode} isLoading={source.isLoading} isError={false} onOpen={() => openMetric(stat.key)} />
              ))}
            </CardGrid>
          </section>
        );
      })}
    </div>
  );
}
