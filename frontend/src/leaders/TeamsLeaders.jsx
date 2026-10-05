import { useState } from "react";
import { motion } from "motion/react";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import LabelledSelect from "../lib/LabelledSelect";
import { listContainer } from "../lib/motion";
import Panel from "../lib/Panel";
import SearchField from "../lib/SearchField";
import { TabStrip } from "../lib/TabStrip";
import { Avatar, BoardHeader, BoardRow, BoardTopLine, CardGrid, CategoryCard, StatChips } from "./LeaderParts";
import { barShare, rankRows } from "./leaderData";
import { TEAM_CARDS, TEAM_FAMILIES, TEAM_STATS, formatTeamValue, statByKey, useTeamRows, usable } from "./teamData";

// ---- Landing ----

function TeamCard({ stat, rows, onOpen, isLoading, isError, onRetry }) {
  const direction = stat.lowerIsBetter ? 1 : -1;
  const valued = rows.map((row) => ({ row, value: stat.get(row, "perGame") })).filter((entry) => entry.value !== null && !Number.isNaN(entry.value));
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
        team: { code: row.standing?.basic ? `${row.standing.basic.gamesWon}-${row.standing.basic.gamesLost}` : null },
        valueText: formatTeamValue(stat, value, "perGame"),
        share: barShare(value, stat.lowerIsBetter ? worst : best, stat.lowerIsBetter ? best : Math.min(worst, 0)),
      }))}
    />
  );
}

// ---- The full board ----

const PAGE_SIZE = 25;

function TeamsBoard({ seasonCode, metric, source, params, setParams, backToCards }) {
  const stat = statByKey(metric) ?? TEAM_STATS[0];
  const mode = params.get("mode") === "accumulated" ? "accumulated" : "perGame";
  const direction = params.get("direction") ?? (stat.lowerIsBetter ? "asc" : "desc");
  const search = params.get("search") ?? "";
  const [family, setFamily] = useState(stat.family);
  const sign = direction === "asc" ? 1 : -1;

  const valued = source.rows.map((row) => ({ row, value: stat.get(row, mode) })).filter((entry) => entry.value !== null && !Number.isNaN(entry.value));
  valued.sort((a, b) => sign * (a.value - b.value));
  const ranked = rankRows(valued, (entry) => entry.value);
  const shown = ranked.filter(({ row: { row } }) => !search || row.name.toLowerCase().includes(search.toLowerCase()));
  const best = ranked[0]?.value ?? null;
  const last = ranked.length ? ranked[ranked.length - 1].value : 0;
  const top = sign === 1 ? last : best;
  const bottom = sign === 1 ? best : Math.min(last, 0);
  const hasMode = stat.kind === "count";

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

  return (
    <div className="flex flex-col gap-4">
      <BoardTopLine onBack={backToCards}>
        <p className="muted text-sm">{hasMode ? (mode === "perGame" ? "Per game" : "Season totals") : "Whole phase"} · overtime counted</p>
      </BoardTopLine>
      <div>
        <TabStrip
          ariaLabel="Team statistic family"
          panelId="leaders-team-stats"
          activeKey={family}
          onChange={setFamily}
          className="mb-3 w-fit"
          tabs={TEAM_FAMILIES.filter((entry) => TEAM_STATS.some((candidate) => candidate.family === entry && usable(candidate, source))).map((entry) => ({ key: entry, label: entry }))}
        />
        <StatChips
          id="leaders-team-stats"
          items={TEAM_STATS.filter((entry) => entry.family === family && usable(entry, source))}
          activeKey={stat.key}
          onChoose={(key) => update({ metric: key, direction: undefined, offset: undefined })}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {hasMode ? (
          <LabelledSelect label="Team statistics" ariaLabel="Team statistics mode" value={mode} onChange={(event) => update({ mode: event.target.value === "perGame" ? undefined : event.target.value })}>
            <option value="perGame">Per game</option>
            <option value="accumulated">Totals</option>
          </LabelledSelect>
        ) : null}
        <LabelledSelect label="Order" ariaLabel="Team sort direction" value={direction} onChange={(event) => update({ direction: event.target.value })}>
          <option value="desc">Highest first</option>
          <option value="asc">Lowest first</option>
        </LabelledSelect>
        <SearchField label="Search teams by name" placeholder="Search teams..." value={search} onChange={(event) => update({ search: event.target.value || undefined })} />
      </div>
      {source.isLoading ? (
        <AsyncState status="loading" label="Loading the team leaderboard" />
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

export default function TeamsLeaders({ seasonCode, phaseCode, params, setParams }) {
  const metric = params.get("metric");
  const source = useTeamRows(seasonCode, phaseCode);
  const openMetric = (key) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("metric", key);
      return next;
    });
  const backToCards = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of ["metric", "mode", "direction", "search"]) next.delete(key);
      return next;
    });

  if (metric) return <TeamsBoard seasonCode={seasonCode} metric={metric} source={source} params={params} setParams={setParams} backToCards={backToCards} />;
  if (source.isError) return <AsyncState status="error" message="Could not load the team leaderboard." onRetry={source.refetch} />;
  return (
    <div className="flex flex-col gap-4">
      {phaseCode !== "RS" ? (
        <p className="muted text-sm">Ratings for the play-in, playoffs and Final Four cover the whole postseason together.</p>
      ) : null}
      <CardGrid>
        {TEAM_CARDS.map((key) => statByKey(key)).filter((stat) => usable(stat, source)).map((stat) => (
          <TeamCard key={stat.key} stat={stat} rows={source.rows} isLoading={source.isLoading} isError={false} onOpen={() => openMetric(stat.key)} />
        ))}
      </CardGrid>
    </div>
  );
}
