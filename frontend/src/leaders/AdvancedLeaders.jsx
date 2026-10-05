import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getAdvancedLeaders } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import LabelledSelect from "../lib/LabelledSelect";
import { listContainer } from "../lib/motion";
import Panel from "../lib/Panel";
import { nameParts, titleCase } from "../lib/playerName";
import { TabStrip } from "../lib/TabStrip";
import { Avatar, BoardHeader, BoardRow, BoardTopLine, CardGrid, CategoryCard, StatChips, TeamTag } from "./LeaderParts";
import { barShare, formatAdvancedValue } from "./leaderData";
import { ADVANCED_CARDS, ADVANCED_FAMILIES, ADVANCED_SCOPES, ADVANCED_STATS } from "./leaderDefs";

const PAGE_SIZE = 25;
const MINUTE_OPTIONS = [0, 100, 200, 300, 500, 800];

const statByKey = (key) => ADVANCED_STATS.find((stat) => stat.key === key);
const displayName = (entry) => {
  const { last, first } = nameParts(entry.playerName ?? entry.personKey);
  return `${titleCase(first)} ${titleCase(last)}`.trim();
};
const teamOf = (entry) => ({ code: entry.clubCode, name: entry.clubName, crestUrl: entry.crestUrl });
const order = (stat) => (stat.lowerIsBetter ? "asc" : "desc");

// ---- Landing ----

function AdvancedCard({ stat, seasonCode, scope, onOpen }) {
  const query = useQuery({
    queryKey: ["leaders-advanced-card", seasonCode, scope, stat.key],
    queryFn: () => getAdvancedLeaders(seasonCode, { metric: stat.key, scope, limit: 5, order: order(stat) }),
    enabled: Boolean(scope),
  });
  const entries = query.data?.entries ?? [];
  const best = entries.length ? Number(entries[0].value) : null;
  const worst = entries.length ? Number(entries[entries.length - 1].value) : 0;
  return (
    <CategoryCard
      kicker={stat.family.toUpperCase()}
      title={stat.label}
      tip={stat.tip}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      onOpen={onOpen}
      footnote={query.data?.earlySeason ? "Early in the season: small samples." : null}
      entries={entries.map((entry, index) => ({
        key: `${entry.personKey}-${entry.clubCode}`,
        rank: index + 1,
        name: displayName(entry),
        imageUrl: entry.imageUrl,
        team: teamOf(entry),
        valueText: formatAdvancedValue(stat, entry.value),
        share: barShare(Number(entry.value), stat.lowerIsBetter ? worst : best, stat.lowerIsBetter ? best : Math.min(worst, 0)),
      }))}
    />
  );
}

// ---- The full board ----

function AdvancedBoard({ seasonCode, scope, metric, params, setParams, backToCards }) {
  const stat = statByKey(metric) ?? ADVANCED_STATS[0];
  const offset = Number(params.get("offset")) || 0;
  const minutesParam = params.get("minMinutes");
  const direction = params.get("direction") ?? order(stat);
  const [family, setFamily] = useState(stat.family);

  const pageQuery = useQuery({
    queryKey: ["leaders-advanced-board", seasonCode, scope, stat.key, direction, minutesParam, offset],
    queryFn: () =>
      getAdvancedLeaders(seasonCode, { metric: stat.key, scope, limit: PAGE_SIZE, offset, order: direction, minMinutes: minutesParam ?? undefined }),
    enabled: Boolean(scope),
  });
  // The best value, for the bars: the first row of the first page.
  const topQuery = useQuery({
    queryKey: ["leaders-advanced-top", seasonCode, scope, stat.key, direction, minutesParam],
    queryFn: () => getAdvancedLeaders(seasonCode, { metric: stat.key, scope, limit: 1, order: direction, minMinutes: minutesParam ?? undefined }),
    enabled: Boolean(scope),
  });
  const entries = pageQuery.data?.entries ?? [];
  const total = pageQuery.data?.total ?? 0;
  const top = topQuery.data?.entries[0] ? Number(topQuery.data.entries[0].value) : null;
  const lowestFirst = direction === "asc";
  const defaultMinutes = pageQuery.data?.defaultMinMinutes ?? null;

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
        <p className="muted text-sm">{stat.tip ?? stat.label}</p>
        {pageQuery.data?.earlySeason ? <span className="badge badge-warning badge-outline">Early season: small samples</span> : null}
      </BoardTopLine>
      <div>
        <TabStrip
          ariaLabel="Advanced statistic family"
          panelId="leaders-advanced-stats"
          activeKey={family}
          onChange={setFamily}
          className="mb-3 w-fit"
          tabs={ADVANCED_FAMILIES.map((entry) => ({ key: entry, label: entry }))}
        />
        <StatChips
          id="leaders-advanced-stats"
          items={ADVANCED_STATS.filter((entry) => entry.family === family)}
          activeKey={stat.key}
          onChoose={(key) => update({ metric: key, direction: undefined, offset: undefined })}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <LabelledSelect label="Order" ariaLabel="Advanced sort direction" value={direction} onChange={(event) => update({ direction: event.target.value, offset: undefined })} disabled={["rapm", "onOff", "per", "winShares", "winSharesPer40"].includes(stat.key)}>
          <option value="desc">Highest first</option>
          <option value="asc">Lowest first</option>
        </LabelledSelect>
        <LabelledSelect label="Minimum minutes" ariaLabel="Minimum minutes played" value={minutesParam ?? ""} onChange={(event) => update({ minMinutes: event.target.value, offset: undefined })}>
          <option value="">{defaultMinutes !== null ? `Default (${defaultMinutes}+ min)` : "Default"}</option>
          {MINUTE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value === 0 ? "No minimum" : `${value}+ minutes`}
            </option>
          ))}
        </LabelledSelect>
      </div>

      {pageQuery.isLoading ? (
        <AsyncState status="loading" label="Loading the advanced leaderboard" />
      ) : pageQuery.isError ? (
        <AsyncState status="error" message="Could not load the advanced leaderboard." onRetry={() => pageQuery.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyText>No players meet the minimum yet.</EmptyText>
      ) : (
        <Panel className="p-2 sm:p-3">
          <p className="muted px-2 pb-2 text-sm">
            Showing {offset + 1}-{offset + entries.length} of {total} players
          </p>
          <BoardHeader columns={["GP", "MIN"]} valueLabel={stat.label.length > 8 ? "VALUE" : stat.label} />
          <motion.ol variants={listContainer} initial="hidden" animate="show" key={`${stat.key}-${direction}-${offset}-${minutesParam}-${scope}`}>
            {entries.map((entry, index) => (
              <BoardRow
                key={`${entry.personKey}-${entry.clubCode}`}
                rank={offset + index + 1}
                avatar={<Avatar imageUrl={entry.imageUrl} />}
                name={displayName(entry)}
                sub={<TeamTag {...teamOf(entry)} />}
                columns={[
                  { label: "Games played", value: entry.games ?? "—" },
                  { label: "Minutes played", value: entry.seconds != null ? Math.round(entry.seconds / 60) : "—" },
                ]}
                valueText={formatAdvancedValue(stat, entry.value)}
                share={barShare(Number(entry.value), lowestFirst ? Number(entries[entries.length - 1]?.value) : top, lowestFirst ? top : Math.min(0, Number(entries[entries.length - 1]?.value)))}
                to={`/${seasonCode}/players/${entry.personKey}`}
              />
            ))}
          </motion.ol>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-sm" disabled={offset === 0} onClick={() => update({ offset: Math.max(0, offset - PAGE_SIZE) || undefined })}>
              Previous page
            </button>
            <button type="button" className="btn btn-sm" disabled={offset + PAGE_SIZE >= total} onClick={() => update({ offset: offset + PAGE_SIZE })}>
              Next page
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

export default function AdvancedLeaders({ seasonCode, params, setParams }) {
  const metric = params.get("metric");
  // The scopes the season has (a season in progress has no postseason yet).
  const scopesQuery = useQuery({
    queryKey: ["leaders-advanced-scopes", seasonCode],
    queryFn: () => getAdvancedLeaders(seasonCode, { metric: "per", limit: 1 }),
  });
  const scopes = ADVANCED_SCOPES.filter((entry) => (scopesQuery.data?.scopes ?? []).includes(entry.key));
  const requested = params.get("ascope");
  const scope = scopes.some((entry) => entry.key === requested) ? requested : (scopes[0]?.key ?? null);

  const set = (patch) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
  const openMetric = (key) => set({ metric: key, offset: undefined });
  const backToCards = () => set({ metric: undefined, direction: undefined, minMinutes: undefined, offset: undefined });

  if (scopesQuery.isLoading) return <AsyncState status="loading" label="Loading advanced leaders" />;
  if (scopesQuery.isError) return <AsyncState status="error" message="Could not load advanced leaders." onRetry={() => scopesQuery.refetch()} />;
  if (!scope) return <EmptyText>Advanced statistics are not available for this season yet.</EmptyText>;

  return (
    <div className="flex flex-col gap-4">
      <TabStrip
        ariaLabel="Advanced leaders scope"
        level={2}
        panelId="leaders-advanced-panel"
        activeKey={scope}
        onChange={(key) => set({ ascope: key, offset: undefined })}
        className="w-fit"
        tabs={scopes.map((entry) => ({ key: entry.key, label: entry.label }))}
      />
      <div id="leaders-advanced-panel">
        {metric ? (
          <AdvancedBoard seasonCode={seasonCode} scope={scope} metric={metric} params={params} setParams={setParams} backToCards={backToCards} />
        ) : (
          <CardGrid>
            {ADVANCED_CARDS.map((key) => (
              <AdvancedCard key={key} stat={statByKey(key)} seasonCode={seasonCode} scope={scope} onOpen={() => openMetric(key)} />
            ))}
          </CardGrid>
        )}
      </div>
    </div>
  );
}
