import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getAdvancedLeaders } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { BoardSkeleton, LandingSkeleton } from "./LeadersSkeleton";
import EmptyText from "../lib/EmptyText";
import { listContainer } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { nameParts, titleCase } from "../lib/playerName";
import { Avatar, BarSelect, BOARD_AVATAR, BoardBar, BoardHeader, BoardPager, BoardRow, CardGrid, CategoryCard, LeadersToolbar, StageSelect, StatSelect, TeamTag } from "./LeaderParts";
import { barShare, formatAdvancedValue } from "./leaderData";
import { ADVANCED_FAMILIES, ADVANCED_SCOPES, ADVANCED_STATS, DEFAULT_SHARE, GAME_SHARES, gameShareFrom, gameShareLabel } from "./leaderDefs";

const PAGE_SIZE = 25;

const statByKey = (key) => ADVANCED_STATS.find((stat) => stat.key === key);
const displayName = (entry) => {
  const { last, first } = nameParts(entry.playerName ?? entry.personKey);
  return `${titleCase(first)} ${titleCase(last)}`.trim();
};
const teamOf = (entry) => ({ code: entry.clubCode, name: entry.clubName, tvCode: entry.clubTvCode, crestUrl: entry.crestUrl });
const order = (stat) => (stat.lowerIsBetter ? "asc" : "desc");
const FIXED_ORDER = ["rapm", "onOff", "per", "winShares", "offWinShares", "defWinShares", "winSharesPer40"];

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
  const share = gameShareFrom(params.get("games"));
  const direction = params.get("direction") ?? order(stat);

  const pageQuery = useQuery({
    queryKey: ["leaders-advanced-board", seasonCode, scope, stat.key, direction, share, offset],
    queryFn: () => getAdvancedLeaders(seasonCode, { metric: stat.key, scope, limit: PAGE_SIZE, offset, order: direction, games: share }),
    enabled: Boolean(scope),
  });
  // The best value, for the bars: the first row of the first page.
  const topQuery = useQuery({
    queryKey: ["leaders-advanced-top", seasonCode, scope, stat.key, direction, share],
    queryFn: () => getAdvancedLeaders(seasonCode, { metric: stat.key, scope, limit: 1, order: direction, games: share }),
    enabled: Boolean(scope),
  });
  const entries = pageQuery.data?.entries ?? [];
  const total = pageQuery.data?.total ?? 0;
  const top = topQuery.data?.entries[0] ? Number(topQuery.data.entries[0].value) : null;
  const lowestFirst = direction === "asc";
  // The games played so far in this scope, for the share choices' labels.
  const gamesSoFar = pageQuery.data?.gamesPlayed ?? 0;

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
  // These boards come in one order from the API, so their heading does not sort.
  const sortable = !FIXED_ORDER.includes(stat.key);
  const toggleOrder = () => update({ direction: direction === "asc" ? "desc" : "asc", offset: undefined });

  return (
    <div className="flex flex-col gap-4">
      <LeadersToolbar>
        {stage}
        <StatSelect families={ADVANCED_FAMILIES} stats={ADVANCED_STATS} activeKey={stat.key} onChoose={chooseStat} />
      </LeadersToolbar>
      {pageQuery.isLoading ? (
        <AsyncState status="loading" label="Loading the advanced leaderboard" skeleton={<BoardSkeleton />} />
      ) : pageQuery.isError ? (
        <AsyncState status="error" message="Could not load the advanced leaderboard." onRetry={() => pageQuery.refetch()} />
      ) : (
        <Panel ref={listRef} className="scroll-mt-28 p-2 sm:p-3">
          <BoardBar
            summary={
              <>
                    <span className="font-semibold">{entries.length ? `Showing ${offset + 1}-${offset + entries.length} of ${total} players` : "No players"}</span>
                    <span className="muted">· {stat.tip ?? stat.label}</span>
                    {pageQuery.data?.earlySeason ? <span className="badge badge-warning badge-outline badge-sm">Early season: small samples</span> : null}
              </>
            }
            activeCount={share !== DEFAULT_SHARE ? 1 : 0}
            onReset={() => update({ games: undefined, offset: undefined })}
          >
            <BarSelect label="Minimum games played" value={share} onChange={(value) => update({ games: value === DEFAULT_SHARE ? undefined : value, offset: undefined })}>
              {GAME_SHARES.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {gameShareLabel(gamesSoFar, entry)}
                </option>
              ))}
              <option value="all">Games: all players</option>
            </BarSelect>
          </BoardBar>
          {entries.length === 0 ? (
            <EmptyText>No players meet the minimum yet.</EmptyText>
          ) : (
            <>
          <BoardHeader columns={["GP", "MIN"]} valueLabel={stat.label.length > 8 ? "VALUE" : stat.label} sort={sortable ? { direction, onToggle: toggleOrder } : undefined} />
          <motion.ol variants={listContainer} initial="hidden" animate="show" key={`${stat.key}-${direction}-${offset}-${share}-${scope}`}>
            {entries.map((entry, index) => (
              <BoardRow
                key={`${entry.personKey}-${entry.clubCode}`}
                rank={offset + index + 1}
                avatar={<Avatar optimize imageUrl={entry.imageUrl} size={BOARD_AVATAR} />}
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
          <BoardPager offset={offset} pageSize={PAGE_SIZE} total={total} onChange={(next) => changePage(next || undefined)} />
            </>
          )}
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
          <div className="flex flex-col gap-8 lg:gap-5">
            <LeadersToolbar>{stage}</LeadersToolbar>
            {ADVANCED_FAMILIES.map((family) => (
              <section key={family} className="flex flex-col gap-4 lg:gap-3" aria-label={family}>
                <PanelHeader compact title={family} />
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
