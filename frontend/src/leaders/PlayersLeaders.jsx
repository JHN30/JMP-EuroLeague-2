import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getLeaderForm, getSeasonGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { BoardSkeleton, FormSkeleton } from "./LeadersSkeleton";
import EmptyText from "../lib/EmptyText";
import FilterDisclosure from "../games/FilterDisclosure";
import { formatSignedDecimal } from "../lib/format";
import LabelledSelect from "../lib/LabelledSelect";
import { listContainer } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { nameParts, titleCase } from "../lib/playerName";
import SearchField from "../lib/SearchField";
import { TabStrip } from "../lib/TabStrip";
import { Avatar, BoardHeader, BoardRow, BoardTopLine, CardGrid, CategoryCard, LeadersToolbar, ModeToggle, RankBadge, StatSelect, TeamTag } from "./LeaderParts";
import { barShare, fetchQualifiedPool, formatPlayerValue, hasVolume, playerValue, rankRows, statNumber } from "./leaderData";
import { FORM_STATS, PLAYER_CARDS, PLAYER_FAMILIES, PLAYER_STATS, PLAYER_TOTAL_CARDS } from "./leaderDefs";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "../players/leagueLeaderboard";

const PAGE_SIZE = 25;
const FORM_GAMES = 5;

const statByKey = (key) => PLAYER_STATS.find((stat) => stat.key === key);
// Minutes a game: the per-game table has them, the totals table has the season's minutes to divide by games.
const minutesPerGame = (player, mode) => {
  const minutes = statNumber(player.traditional?.minutesPlayed);
  const games = statNumber(player.traditional?.gamesPlayed);
  if (minutes === null) return "—";
  return (mode === "perGame" ? minutes : games ? minutes / games : 0).toFixed(1);
};
const displayName = (player) => {
  const { last, first } = nameParts(player.playerName ?? player.personKey);
  return `${titleCase(first)} ${titleCase(last)}`.trim();
};
const teamOf = (player) => ({ code: player.clubCode, name: player.clubName, tvCode: player.clubTvCodes, crestUrl: player.clubImageUrl });

// ---- Landing: a card per category, then who is hot and who has moved ----

// `query` is the landing's one pool of qualified players. The card keeps those with a value and the stat's volume, and sorts them
// the way the API would (a stable sort, so equal values keep the pool's order, the API's tie-break).
function PlayerCard({ stat, seasonCode, mode, query, onOpen }) {
  const lowerFirst = stat.lowerIsBetter && !stat.showMost;
  const players = useMemo(
    () =>
      (query.data ?? [])
        .filter((player) => playerValue(player, stat) !== null && hasVolume(player, stat, mode))
        .sort((a, b) => (lowerFirst ? playerValue(a, stat) - playerValue(b, stat) : playerValue(b, stat) - playerValue(a, stat)))
        .slice(0, 5),
    [query.data, stat, mode, lowerFirst],
  );
  const ranked = rankRows(players, (player) => playerValue(player, stat));
  const best = ranked[0]?.value ?? null;
  const worst = ranked.length ? ranked[ranked.length - 1].value : 0;

  return (
    <CategoryCard
      kicker={stat.family.toUpperCase()}
      title={stat.label}
      tip={stat.tip}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      onOpen={onOpen}
      footnote={stat.volume ? `Needs ${stat.volume.label}.` : stat.showMost ? "Most first." : null}
      entries={ranked.map(({ row, rank, value }) => ({
        key: row.personKey,
        rank,
        name: displayName(row),
        imageUrl: row.playerImageUrl,
        team: teamOf(row),
        to: `/${seasonCode}/players/${row.personKey}`,
        valueText: formatPlayerValue(stat, value, mode),
        share: barShare(value, lowerFirst ? worst : best, lowerFirst ? best : Math.min(worst, 0)),
      }))}
    />
  );
}

// The hot-right-now and rank-movers panels for one stat, from the API's per-player form (last five games, and the rank now
// and before the latest round). Only players who have played all five of their recent games are listed.
function FormSection({ seasonCode, phaseCode, openMetric }) {
  const [statKey, setStatKey] = useState("pts");
  const stat = FORM_STATS.find((entry) => entry.key === statKey);
  const formQuery = useQuery({
    queryKey: ["leaders-form", seasonCode, phaseCode, FORM_GAMES],
    queryFn: () => getLeaderForm(seasonCode, { phase: phaseCode, games: FORM_GAMES }),
    enabled: Boolean(phaseCode),
  });
  // A finished season has no "right now": the same numbers are its closing stretch.
  const nextQuery = useQuery({
    queryKey: ["leaders-season-live", seasonCode],
    queryFn: () => getSeasonGames(seasonCode, { status: "scheduled", limit: 1 }),
  });
  const live = (nextQuery.data?.games.length ?? 0) > 0;

  const players = formQuery.data?.players ?? [];
  const full = players.filter((player) => player.recentGames >= FORM_GAMES);
  const hot = [...full].sort((a, b) => (b.recent[statKey] ?? -Infinity) - (a.recent[statKey] ?? -Infinity)).slice(0, 5);
  const moved = players.filter((player) => player.rank[statKey].before !== null).map((player) => ({ player, change: player.rank[statKey].before - player.rank[statKey].now }));
  const climbers = moved.filter((entry) => entry.change > 0).sort((a, b) => b.change - a.change).slice(0, 3);
  const fallers = moved.filter((entry) => entry.change < 0).sort((a, b) => a.change - b.change).slice(0, 3);

  if (formQuery.isLoading) return <AsyncState status="loading" label="Loading player form" skeleton={<FormSkeleton />} />;
  if (formQuery.isError) return <AsyncState status="error" message="Could not load player form." onRetry={() => formQuery.refetch()} />;
  if (full.length === 0) {
    return <EmptyText>Player form appears once players have five games in this phase.</EmptyText>;
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Player form">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PanelHeader kicker={live ? "FORM" : "THE CLOSING STRETCH"} title={live ? "Hot right now" : "Strong finish"} />
        <TabStrip
          scrolling
          ariaLabel="Form statistic"
          panelId="leaders-form-panel"
          activeKey={statKey}
          onChange={setStatKey}
          className="w-fit"
          tabs={FORM_STATS.map((entry) => ({ key: entry.key, label: entry.short }))}
        />
      </div>
      <div id="leaders-form-panel" className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[3fr_2fr]">
        <Panel className="p-4">
          <h3 className="mb-1 text-lg font-bold">{stat.label}: the last {FORM_GAMES} games</h3>
          <p className="muted mb-3 text-sm">Per game over their last {FORM_GAMES} games, against their season average.</p>
          <motion.ol className="flex flex-col" variants={listContainer} initial="hidden" animate="show" key={`${statKey}-${phaseCode}`}>
            {hot.map((player, index) => {
              const recent = player.recent[statKey];
              const difference = recent - player.season[statKey];
              return (
                <li key={player.personKey} className="border-b border-base-300 last:border-0">
                  <Link to={`/${seasonCode}/players/${player.personKey}`} className="board-row-link flex items-center gap-2 py-2 sm:gap-3">
                      <RankBadge rank={index + 1} />
                    <Avatar optimize imageUrl={player.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate">{displayName({ playerName: player.playerName, personKey: player.personKey })}</p>
                      <TeamTag code={player.clubCode} name={player.clubName} tvCode={player.clubTvCode} crestUrl={player.crestUrl} />
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-xl font-black tabular-nums">{recent.toFixed(1)}</p>
                      <p className={`text-xs tabular-nums ${difference >= 0 ? "text-success" : "text-error"}`} title="Against their season average">
                        {formatSignedDecimal(difference)} vs {player.season[statKey].toFixed(1)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </motion.ol>
        </Panel>
        <Panel className="p-4">
          <h3 className="mb-1 text-lg font-bold">{stat.label}: who has moved</h3>
          <p className="muted mb-3 text-sm">Places gained or lost on the per-game {stat.label.toLowerCase()} board since before the latest round.</p>
          {climbers.length + fallers.length === 0 ? (
            <EmptyText>No one has changed place.</EmptyText>
          ) : (
            <ul className="flex flex-col">
              {[...climbers, ...fallers].map(({ player, change }) => (
                <li key={player.personKey} className="border-b border-base-300 last:border-0">
                  <Link to={`/${seasonCode}/players/${player.personKey}`} className="board-row-link flex items-center gap-2 py-2 sm:gap-3">
                    <span className={`w-10 text-sm font-bold tabular-nums ${change > 0 ? "text-success" : "text-error"}`}>
                      {change > 0 ? "▲" : "▼"}
                      {Math.abs(change)}
                    </span>
                    <Avatar optimize imageUrl={player.imageUrl} size="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate">{displayName({ playerName: player.playerName, personKey: player.personKey })}</p>
                      <p className="muted text-xs tabular-nums">
                        #{player.rank[statKey].before} → #{player.rank[statKey].now}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => openMetric(stat.field)}>
            See the full {stat.label.toLowerCase()} leaderboard →
          </button>
        </Panel>
      </div>
    </section>
  );
}

function PlayersLanding({ seasonCode, phaseCode, stage, params, setParams, openMetric }) {
  const mode = params.get("mode") === "accumulated" ? "accumulated" : "perGame";
  const poolQuery = useQuery({
    queryKey: ["leaders-card-pool", seasonCode, phaseCode, mode],
    queryFn: () => fetchQualifiedPool(seasonCode, phaseCode, mode),
    enabled: Boolean(phaseCode),
  });
  const setMode = (key) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (key === "perGame") next.delete("mode");
      else next.set("mode", key);
      return next;
    });
  return (
    <div className="flex flex-col gap-8">
      <LeadersToolbar>
        {stage}
        <ModeToggle ariaLabel="Player statistics mode" mode={mode} onChange={setMode} />
      </LeadersToolbar>
      {PLAYER_FAMILIES.map((family) => {
        const keys = (mode === "accumulated" ? PLAYER_TOTAL_CARDS : PLAYER_CARDS).filter((key) => statByKey(key).family === family);
        if (keys.length === 0) return null;
        return (
          <section key={family} className="flex flex-col gap-4" aria-label={family}>
            <PanelHeader title={family} />
            <CardGrid>
              {keys.map((key) => (
                <PlayerCard key={key} stat={statByKey(key)} seasonCode={seasonCode} mode={mode} query={poolQuery} onOpen={() => openMetric(key, statByKey(key).showMost ? "desc" : undefined)} />
              ))}
            </CardGrid>
          </section>
        );
      })}
      <FormSection seasonCode={seasonCode} phaseCode={phaseCode} openMetric={openMetric} />
    </div>
  );
}

// ---- The full board for one stat ----

const MIN_GAMES_OPTIONS = [1, 5, 10, 15];

function PlayersBoard({ seasonCode, phaseCode, stage, metric, params, setParams }) {
  const stat = statByKey(metric) ?? PLAYER_STATS[0];
  const mode = params.get("mode") === "accumulated" ? "accumulated" : "perGame";
  const direction = params.get("direction") ?? (stat.lowerIsBetter ? "asc" : "desc");
  const minGames = Number(params.get("minGames")) || 0;
  const team = params.get("team") ?? "";
  const position = params.get("position") ?? "";
  const search = params.get("search") ?? "";
  const offset = Number(params.get("offset")) || 0;

  // The season's whole list, shared with the player pages, sorted here by the stat: a stable sort keeps equal values in the
  // list's order, which is the API's tie-break, so a change of stat or direction needs no request.
  const boardQuery = useQuery({
    queryKey: leaderboardQueryKey(seasonCode, phaseCode, mode),
    queryFn: () => fetchLeagueLeaderboard(seasonCode, phaseCode, mode),
    enabled: Boolean(phaseCode),
  });
  const sorted = useMemo(() => {
    const value = (player) => playerValue(player, stat);
    return [...(boardQuery.data ?? [])].sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      if (x === null || y === null) return x === null ? (y === null ? 0 : 1) : -1;
      return direction === "asc" ? x - y : y - x;
    });
  }, [boardQuery.data, stat, direction]);
  // Rank movement is the per-game board's, and only for the six stats the form endpoint covers.
  const formStat = FORM_STATS.find((entry) => entry.field === stat.key);
  const formQuery = useQuery({
    queryKey: ["leaders-form", seasonCode, phaseCode, FORM_GAMES],
    queryFn: () => getLeaderForm(seasonCode, { phase: phaseCode, games: FORM_GAMES }),
    enabled: Boolean(phaseCode) && Boolean(formStat) && mode === "perGame",
  });
  const movement = useMemo(() => {
    if (!formStat || mode !== "perGame") return new Map();
    return new Map((formQuery.data?.players ?? []).map((player) => [player.personKey, player.rank[formStat.key]]));
  }, [formQuery.data, formStat, mode]);

  const all = sorted;
  const phaseMinGames = all[0]?.minGames ?? null;
  // The ranked pool: qualified players (or at least N games) with enough volume for the stat. Team, position and search only
  // narrow what is shown, so a row keeps its true rank.
  const pool = all.filter(
    (player) =>
      (minGames > 0 ? (statNumber(player.traditional?.gamesPlayed) ?? 0) >= minGames : player.qualified !== false) &&
      playerValue(player, stat) !== null &&
      hasVolume(player, stat, mode),
  );
  const ranked = rankRows(pool, (player) => playerValue(player, stat));
  const teams = [...new Map(pool.filter((p) => p.clubCode).map((p) => [p.clubCode, p.clubName ?? p.clubCode])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const positions = [...new Set(pool.map((p) => p.positionName).filter(Boolean))].sort();
  const shown = ranked.filter(
    ({ row }) =>
      (!team || row.clubCode === team) &&
      (!position || row.positionName === position) &&
      (!search || (row.playerName ?? "").toLowerCase().includes(search.toLowerCase())),
  );
  const page = shown.slice(offset, offset + PAGE_SIZE);
  const best = ranked[0]?.value ?? null;
  const worst = ranked.length ? ranked[ranked.length - 1].value : 0;
  const top = stat.lowerIsBetter ? worst : best;
  const bottom = stat.lowerIsBetter ? best : 0;

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
  const setMode = (key) => update({ mode: key === "perGame" ? undefined : key, offset: undefined });
  const chooseStat = (key) => update({ metric: key, direction: undefined, offset: undefined, mode: stat.kind === "games" ? mode : params.get("mode") });
  const activeFilters = [minGames > 0, team, position, search].filter(Boolean).length;
  // The page buttons are under the list, so a new page brings the top of the list back into view.
  const listRef = useRef(null);
  const changePage = (nextOffset) => {
    update({ offset: nextOffset });
    listRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="flex flex-col gap-4">
      <LeadersToolbar>
        {stage}
        <StatSelect families={PLAYER_FAMILIES} stats={PLAYER_STATS} activeKey={stat.key} onChoose={chooseStat} />
        <ModeToggle ariaLabel="Player statistics mode" mode={mode} onChange={setMode} />
      </LeadersToolbar>
      <BoardTopLine>
        <p className="muted text-sm">
          {mode === "perGame" ? "Per game" : "Season totals"} · {phaseMinGames && minGames === 0 ? `qualified players (${phaseMinGames}+ games)` : minGames > 1 ? `${minGames}+ games` : "all players"}
        </p>
      </BoardTopLine>

      <div className="grid grid-cols-2 items-end gap-3 max-sm:[&_select]:w-full sm:flex sm:flex-wrap">
        <LabelledSelect label="Order" ariaLabel="Player sort direction" value={direction} onChange={(event) => update({ direction: event.target.value, offset: undefined })}>
          <option value="desc">Highest first</option>
          <option value="asc">Lowest first</option>
        </LabelledSelect>
        <FilterDisclosure activeCount={activeFilters} className="col-span-2 sm:contents" gridClassName="sm:contents">
          <LabelledSelect label="Minimum games" ariaLabel="Minimum games played" value={String(minGames)} onChange={(event) => update({ minGames: Number(event.target.value) || undefined, offset: undefined })}>
            <option value="0">{phaseMinGames ? `Qualified (${phaseMinGames}+ games)` : "Qualified players"}</option>
            {MIN_GAMES_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value === 1 ? "All players" : `${value}+ games`}
              </option>
            ))}
          </LabelledSelect>
          <LabelledSelect label="Team" ariaLabel="Team" value={team} onChange={(event) => update({ team: event.target.value || undefined, offset: undefined })}>
            <option value="">All teams</option>
            {teams.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </LabelledSelect>
          <LabelledSelect label="Position" ariaLabel="Position" value={position} onChange={(event) => update({ position: event.target.value || undefined, offset: undefined })}>
            <option value="">All positions</option>
            {positions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </LabelledSelect>
          <SearchField label="Search players by name" placeholder="Search players..." value={search} onChange={(event) => update({ search: event.target.value || undefined, offset: undefined })} />
        </FilterDisclosure>
      </div>
      {stat.volume ? <p className="muted text-sm">Ranked among players with {stat.volume.label}.</p> : null}

      {boardQuery.isLoading ? (
        <AsyncState status="loading" label="Loading the player leaderboard" skeleton={<BoardSkeleton />} />
      ) : boardQuery.isError ? (
        <AsyncState status="error" message="Could not load the player leaderboard." onRetry={() => boardQuery.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyText>No players match these filters.</EmptyText>
      ) : (
        <Panel ref={listRef} className="scroll-mt-28 p-2 sm:p-3">
          <p className="muted px-2 pb-2 text-sm">
            Showing {offset + 1}-{offset + page.length} of {shown.length} players
          </p>
          <BoardHeader columns={["GP", "MIN"]} valueLabel={stat.short} />
          <motion.ol variants={listContainer} initial="hidden" animate="show" key={`${stat.key}-${mode}-${direction}-${offset}-${team}-${position}-${search}-${minGames}`}>
            {page.map(({ row, rank, value }) => {
              const move = movement.get(row.personKey);
              return (
                <BoardRow
                  key={row.personKey}
                  rank={rank}
                  change={move && move.before !== null ? move.before - move.now : null}
                  avatar={<Avatar optimize imageUrl={row.playerImageUrl} />}
                  name={displayName(row)}
                  sub={
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                      <TeamTag {...teamOf(row)} />
                      {row.positionName ? <span className="muted text-xs">· {row.positionName}</span> : null}
                    </span>
                  }
                  columns={[
                    { label: "Games played", value: Math.round(statNumber(row.traditional?.gamesPlayed) ?? 0) },
                    { label: "Minutes per game", value: minutesPerGame(row, mode) },
                  ]}
                  valueText={formatPlayerValue(stat, value, mode)}
                  share={barShare(value, top, bottom)}
                  to={`/${seasonCode}/players/${row.personKey}`}
                />
              );
            })}
          </motion.ol>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-sm" disabled={offset === 0} onClick={() => changePage(Math.max(0, offset - PAGE_SIZE) || undefined)}>
              Previous page
            </button>
            <button type="button" className="btn btn-sm" disabled={offset + PAGE_SIZE >= shown.length} onClick={() => changePage(offset + PAGE_SIZE)}>
              Next page
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

export default function PlayersLeaders({ seasonCode, phaseCode, stage, params, setParams }) {
  const metric = params.get("metric");
  // Opening a category swaps the page's view on one path (only `?metric=` changes), so ScrollToTop does not run: the page goes to the top
  // by itself. Going back to the categories does the same, from the page's back link (LeadersPage).
  const openMetric = (key, direction) => {
    window.scrollTo(0, 0);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("metric", key);
      next.delete("offset");
      if (direction) next.set("direction", direction);
      return next;
    });
  };

  return metric ? (
    <PlayersBoard seasonCode={seasonCode} phaseCode={phaseCode} stage={stage} metric={metric} params={params} setParams={setParams} />
  ) : (
    <PlayersLanding seasonCode={seasonCode} phaseCode={phaseCode} stage={stage} params={params} setParams={setParams} openMetric={openMetric} />
  );
}
