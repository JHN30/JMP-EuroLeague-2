import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getAdvancedLeaders } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { BoardSkeleton, LandingSkeleton } from "./LeadersSkeleton";
import EmptyText from "../lib/EmptyText";
import FilterDisclosure from "../games/FilterDisclosure";
import LabelledSelect from "../lib/LabelledSelect";
import { listContainer } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { nameParts, titleCase } from "../lib/playerName";
import { Avatar, BoardHeader, BoardRow, BoardTopLine, CardGrid, CategoryCard, LeadersToolbar, StageSelect, StatSelect, TeamTag } from "./LeaderParts";
import { barShare, formatAdvancedValue } from "./leaderData";
import { ADVANCED_FAMILIES, ADVANCED_SCOPES, ADVANCED_STATS } from "./leaderDefs";

const PAGE_SIZE = 25;
const MINUTE_OPTIONS = [0, 100, 200, 300, 500, 800];

const statByKey = (key) => ADVANCED_STATS.find((stat) => stat.key === key);
const displayName = (entry) => {
  const { last, first } = nameParts(entry.playerName ?? entry.personKey);
  return `${titleCase(first)} ${titleCase(last)}`.trim();
};
const teamOf = (entry) => ({ code: entry.clubCode, name: entry.clubName, tvCode: entry.clubTvCode, crestUrl: entry.crestUrl });
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
        to: `/${seasonCode}/players/${entry.personKey}`,
        valueText: formatAdvancedValue(stat, entry.value),
        share: barShare(Number(entry.value), stat.lowerIsBetter ? worst : best, stat.lowerIsBetter ? best : Math.min(worst, 0)),
      }))}
    />
  );
}

// ---- The full board ----

function AdvancedBoard({ seasonCode, scope, stage, metric, params, setParams }) {
  const stat = statByKey(metric) ?? ADVANCED_STATS[0];
  const offset = Number(params.get("offset")) || 0;
  const minutesParam = params.get("minMinutes");
  const direction = params.get("direction") ?? order(stat);

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

  // The page buttons are under the list, so a new page brings the top of the list back into view once it has loaded (the list is
  // replaced by a loading state meanwhile, which shortens the page).
  const listRef = useRef(null);
  const pageChanged = useRef(false);
  const changePage = (nextOffset) => {
    pageChanged.current = true;
    update({ offset: nextOffset });
  };
  useEffect(() => {
    if (!pageChanged.current || pageQuery.isLoading) return;
    pageChanged.current = false;
    listRef.current?.scrollIntoView({ block: "start" });
  }, [offset, pageQuery.isLoading]);

  const chooseStat = (key) => update({ metric: key, direction: undefined, offset: undefined });

  return (
    <div className="flex flex-col gap-4">
      <LeadersToolbar>
        {stage}
        <StatSelect families={ADVANCED_FAMILIES} stats={ADVANCED_STATS} activeKey={stat.key} onChoose={chooseStat} />
      </LeadersToolbar>
      <BoardTopLine>
        <p className="muted text-sm">{stat.tip ?? stat.label}</p>
        {pageQuery.data?.earlySeason ? <span className="badge badge-warning badge-outline">Early season: small samples</span> : null}
      </BoardTopLine>
      <div className="grid grid-cols-2 items-end gap-3 max-sm:[&_select]:w-full sm:flex sm:flex-wrap">
        <LabelledSelect label="Order" ariaLabel="Advanced sort direction" value={direction} onChange={(event) => update({ direction: event.target.value, offset: undefined })} disabled={["rapm", "onOff", "per", "winShares", "offWinShares", "defWinShares", "winSharesPer40"].includes(stat.key)}>
          <option value="desc">Highest first</option>
          <option value="asc">Lowest first</option>
        </LabelledSelect>
        <FilterDisclosure activeCount={minutesParam ? 1 : 0} className="col-span-2 sm:contents" gridClassName="sm:contents">
          <LabelledSelect label="Minimum minutes" ariaLabel="Minimum minutes played" value={minutesParam ?? ""} onChange={(event) => update({ minMinutes: event.target.value, offset: undefined })}>
            <option value="">{defaultMinutes !== null ? `Default (${defaultMinutes}+ min)` : "Default"}</option>
            {MINUTE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value === 0 ? "No minimum" : `${value}+ minutes`}
              </option>
            ))}
          </LabelledSelect>
        </FilterDisclosure>
      </div>

      {pageQuery.isLoading ? (
        <AsyncState status="loading" label="Loading the advanced leaderboard" skeleton={<BoardSkeleton />} />
      ) : pageQuery.isError ? (
        <AsyncState status="error" message="Could not load the advanced leaderboard." onRetry={() => pageQuery.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyText>No players meet the minimum yet.</EmptyText>
      ) : (
        <Panel ref={listRef} className="scroll-mt-28 p-2 sm:p-3">
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
            <button type="button" className="btn btn-sm" disabled={offset === 0} onClick={() => changePage(Math.max(0, offset - PAGE_SIZE) || undefined)}>
              Previous page
            </button>
            <button type="button" className="btn btn-sm" disabled={offset + PAGE_SIZE >= total} onClick={() => changePage(offset + PAGE_SIZE)}>
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
  // Opening a category swaps the page's view on one path (only `?metric=` changes), so ScrollToTop does not run: the page goes to the top
  // by itself. Going back to the categories does the same, from the page's back link (LeadersPage).
  const openMetric = (key) => {
    window.scrollTo(0, 0);
    set({ metric: key, offset: undefined });
  };

  if (scopesQuery.isLoading) return <AsyncState status="loading" label="Loading advanced leaders" skeleton={<LandingSkeleton />} />;
  if (scopesQuery.isError) return <AsyncState status="error" message="Could not load advanced leaders." onRetry={() => scopesQuery.refetch()} />;
  if (!scope) return <EmptyText>Advanced statistics are not available for this season yet.</EmptyText>;

  // The advanced scopes are this view's stages.
  const stage = <StageSelect stages={scopes.map((entry) => ({ key: entry.key, label: entry.label }))} value={scope} onChange={(key) => set({ ascope: key, offset: undefined })} />;

  return (
    <div className="flex flex-col gap-4">
      <div id="leaders-advanced-panel">
        {metric ? (
          <AdvancedBoard seasonCode={seasonCode} scope={scope} stage={stage} metric={metric} params={params} setParams={setParams} />
        ) : (
          <div className="flex flex-col gap-8">
            <LeadersToolbar>{stage}</LeadersToolbar>
            {ADVANCED_FAMILIES.map((family) => (
              <section key={family} className="flex flex-col gap-4" aria-label={family}>
                <PanelHeader title={family} />
                <CardGrid>
                  {ADVANCED_STATS.filter((stat) => stat.family === family).map((stat) => (
                    <AdvancedCard key={stat.key} stat={stat} seasonCode={seasonCode} scope={scope} onOpen={() => openMetric(stat.key)} />
                  ))}
                </CardGrid>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
