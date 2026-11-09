import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getLeaderForm, getSeasonGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { BoardSkeleton, FormSkeleton } from "./LeadersSkeleton";
import EmptyText from "../lib/EmptyText";
import { formatSignedDecimal } from "../lib/format";
import { listContainer } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { displayName as fullName } from "../lib/playerName";
import { TabStrip } from "../lib/TabStrip";
import { Avatar, BarSearch, BarSelect, BOARD_AVATAR, BoardBar, BoardHeader, BoardPager, BoardRow, CardGrid, CategoryCard, LeadersToolbar, ModeToggle, RankBadge, StatSelect, TeamTag } from "./LeaderParts";
import { barShare, fetchQualifiedPool, formatPlayerValue, hasVolume, playerValue, rankRows, statNumber, volumeText } from "./leaderData";
import { DEFAULT_SHARE, FORM_STATS, GAME_SHARES, gameShareFrom, gameShareLabel, gamesNeeded, PLAYER_CARDS, PLAYER_FAMILIES, PLAYER_STATS, PLAYER_TOTAL_CARDS } from "./leaderDefs";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "../players/leagueLeaderboard";
import { useLatestRound } from "./useLatestRound";

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
const displayName = (player) => fullName(player.playerName ?? player.personKey);
const teamOf = (player) => ({ code: player.clubCode, name: player.clubName, tvCode: player.clubTvCodes, crestUrl: player.clubImageUrl });

// Who the players' boards rank. A stage with standings has rounds: the latest completed round, so a postponed game does not lower
// the bar and a round still being played does not raise it (useLatestRound); `behind` are the clubs that have played fewer games.
// A player is ranked from half the rounds in games (rounded up: 5 after 9 rounds), and the volume minimums are totals over the
// rounds (hasVolume), measured on the season totals since the per-game view's numbers are rounded. A stage without standings (the
// postseason), or one whose first round is still being played, has no rounds and keeps the feed's minimum.
function useRankingRule(seasonCode, phaseCode, mode) {
  const latest = useLatestRound(seasonCode, phaseCode);
  const rounds = latest.inProgress ? latest.round - 1 : latest.round;
  const needsTotals = rounds > 0 && mode === "perGame";
  const totalsQuery = useQuery({
    queryKey: leaderboardQueryKey(seasonCode, phaseCode, "accumulated"),
    queryFn: () => fetchLeagueLeaderboard(seasonCode, phaseCode, "accumulated"),
    enabled: Boolean(phaseCode) && needsTotals,
  });
  const isLoading = latest.isLoading || (needsTotals && totalsQuery.isLoading);
  const standings = latest.standingsData?.standings;
  // One object while nothing changes, so the cards do not re-rank on every render.
  return useMemo(() => {
    const behind = (standings ?? [])
      .map((row) => ({ name: row.clubName ?? row.clubCode, games: (statNumber(row.basic?.gamesWon) ?? 0) + (statNumber(row.basic?.gamesLost) ?? 0) }))
      .filter((club) => club.games < rounds);
    const totals = new Map((totalsQuery.data ?? []).map((player) => [player.personKey, player]));
    return { rounds: rounds || null, minGames: rounds ? Math.ceil(rounds / 2) : null, totals, behind, isLoading, roundLoading: latest.isLoading };
  }, [standings, latest.isLoading, rounds, totalsQuery.data, isLoading]);
}

// The clubs that have played fewer games than the rounds played, when there are any: their players are held to the same totals.
function BehindNote({ rule, className = "muted text-sm" }) {
  const { behind, rounds } = rule;
  if (!rounds || behind.length === 0) return null;
  const text =
    behind.length === 1
      ? `${behind[0].name} has played ${behind[0].games} of ${rounds} rounds (a postponed game); its players need the same totals.`
      : `${behind.map((club) => club.name).join(", ")} have played fewer than ${rounds} rounds (postponed games); their players need the same totals.`;
  return <p className={className}>{text}</p>;
}

// ---- Landing: a card per category, then who is hot and who has moved ----

// `query` is the landing's one pool of qualified players. The card keeps those with a value and the stat's volume, and sorts them
// the way the API would (a stable sort, so equal values keep the pool's order, the API's tie-break).
function PlayerCard({ stat, seasonCode, mode, query, rule, onOpen }) {
  const lowerFirst = stat.lowerIsBetter && !stat.showMost;
  const players = useMemo(
    () =>
      (query.data ?? [])
        .filter((player) => playerValue(player, stat) !== null && hasVolume(player, stat, mode, rule))
        .sort((a, b) => (lowerFirst ? playerValue(a, stat) - playerValue(b, stat) : playerValue(b, stat) - playerValue(a, stat)))
        .slice(0, 5),
    [query.data, stat, mode, lowerFirst, rule],
  );
  const ranked = rankRows(players, (player) => playerValue(player, stat));
  const best = ranked[0]?.value ?? null;
  const worst = ranked.length ? ranked[ranked.length - 1].value : 0;

  return (
    <CategoryCard
      title={stat.label}
      tip={stat.tip}
      isLoading={query.isLoading || rule.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      onOpen={onOpen}
      footnote={stat.volume ? `Needs ${volumeText(stat.volume, rule.rounds)}.` : stat.showMost ? "Most first." : null}
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
    <section className="flex flex-col gap-4 lg:gap-3" aria-label="Player form">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PanelHeader compact kicker={live ? "FORM" : "THE CLOSING STRETCH"} title={live ? "Hot right now" : "Strong finish"} />
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
        <Panel className="p-4 lg:p-3">
          <h3 className="mb-1 text-lg font-bold lg:mb-0 lg:text-base">{stat.label}: the last {FORM_GAMES} games</h3>
          <p className="muted mb-3 text-sm lg:mb-1">Last {FORM_GAMES} games, against the season average.</p>
          <motion.ol className="flex flex-col" variants={listContainer} initial="hidden" animate="show" key={`${statKey}-${phaseCode}`}>
            {hot.map((player, index) => {
              const recent = player.recent[statKey];
              const difference = recent - player.season[statKey];
              return (
                <li key={player.personKey} className="border-b border-base-300 last:border-0">
                  <Link to={`/${seasonCode}/players/${player.personKey}`} className="board-row-link flex items-center gap-2 py-2 sm:gap-3 lg:py-1">
                    <RankBadge rank={index + 1} compact />
                    <Avatar optimize imageUrl={player.imageUrl} size={BOARD_AVATAR} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate">{displayName({ playerName: player.playerName, personKey: player.personKey })}</p>
                      <TeamTag code={player.clubCode} name={player.clubName} tvCode={player.clubTvCode} crestUrl={player.crestUrl} />
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-xl font-black tabular-nums lg:text-lg lg:leading-tight">{recent.toFixed(1)}</p>
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
        <Panel className="p-4 lg:p-3">
          <h3 className="mb-1 text-lg font-bold lg:mb-0 lg:text-base">{stat.label}: who has moved</h3>
          <p className="muted mb-3 text-sm lg:mb-1">Places on the per-game board since before the latest round.</p>
          {climbers.length + fallers.length === 0 ? (
            <EmptyText>No one has changed place.</EmptyText>
          ) : (
            <ul className="flex flex-col">
              {[...climbers, ...fallers].map(({ player, change }) => (
                <li key={player.personKey} className="border-b border-base-300 last:border-0">
                  <Link to={`/${seasonCode}/players/${player.personKey}`} className="board-row-link flex items-center gap-2 py-2 sm:gap-3 lg:py-1">
                    <span className={`w-10 text-sm font-bold tabular-nums ${change > 0 ? "text-success" : "text-error"}`}>
                      {change > 0 ? "▲" : "▼"}
                      {Math.abs(change)}
                    </span>
                    <Avatar optimize imageUrl={player.imageUrl} size="h-9 w-9 lg:h-8 lg:w-8" />
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
          <button type="button" className="btn btn-ghost btn-sm mt-3 lg:mt-2" onClick={() => openMetric(stat.field)}>
            See the full {stat.label.toLowerCase()} leaderboard →
          </button>
        </Panel>
      </div>
    </section>
  );
}

function PlayersLanding({ seasonCode, phaseCode, stage, params, setParams, openMetric }) {
  const mode = params.get("mode") === "accumulated" ? "accumulated" : "perGame";
  const rule = useRankingRule(seasonCode, phaseCode, mode);
  // The pool waits for the latest round, which says how many games qualify.
  const poolQuery = useQuery({
    queryKey: ["leaders-card-pool", seasonCode, phaseCode, mode, rule.minGames],
    queryFn: () => fetchQualifiedPool(seasonCode, phaseCode, mode, rule.minGames),
    enabled: Boolean(phaseCode) && !rule.roundLoading,
  });
  const setMode = (key) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (key === "perGame") next.delete("mode");
      else next.set("mode", key);
      return next;
    });
  return (
    <div className="flex flex-col gap-8 lg:gap-5">
      <LeadersToolbar>
        {stage}
        <ModeToggle ariaLabel="Player statistics mode" mode={mode} onChange={setMode} />
      </LeadersToolbar>
      <BehindNote rule={rule} />
      {PLAYER_FAMILIES.map((family) => {
        const keys = (mode === "accumulated" ? PLAYER_TOTAL_CARDS : PLAYER_CARDS).filter((key) => statByKey(key).family === family);
        if (keys.length === 0) return null;
        return (
          <section key={family} className="flex flex-col gap-4 lg:gap-3" aria-label={family}>
            <PanelHeader compact title={family} />
            <CardGrid>
              {keys.map((key) => (
                <PlayerCard key={key} stat={statByKey(key)} seasonCode={seasonCode} mode={mode} query={poolQuery} rule={rule} onOpen={() => openMetric(key, statByKey(key).showMost ? "desc" : undefined)} />
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


function PlayersBoard({ seasonCode, phaseCode, stage, metric, params, setParams }) {
  const stat = statByKey(metric) ?? PLAYER_STATS[0];
  const mode = params.get("mode") === "accumulated" ? "accumulated" : "perGame";
  const direction = params.get("direction") ?? (stat.lowerIsBetter ? "asc" : "desc");
  const share = gameShareFrom(params.get("games"));
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
  const rule = useRankingRule(seasonCode, phaseCode, mode);
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
  const gamesOf = (player) => statNumber(player.traditional?.gamesPlayed) ?? 0;
  // The games played so far: the stage's rounds, or in a stage without them (the postseason) the most games any player has.
  const gamesSoFar = rule.rounds ?? all.reduce((most, player) => Math.max(most, gamesOf(player)), 0);
  // While a round is being played, some players already have a game more than the completed rounds.
  const moreThanSoFar = all.some((player) => gamesOf(player) > gamesSoFar);
  const shareEntry = GAME_SHARES.find((entry) => entry.key === share);
  const minGames = shareEntry ? gamesNeeded(gamesSoFar, shareEntry) : 0;
  // The ranked pool: players with the chosen share of the games and enough volume for the stat. Team, position and search only
  // narrow what is shown, so a row keeps its true rank.
  const pool = all.filter((player) => gamesOf(player) >= minGames && playerValue(player, stat) !== null && hasVolume(player, stat, mode, rule));
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
  // Leaving a games count writes the mode it showed; otherwise the live address keeps its own mode.
  const chooseStat = (key) => update({ metric: key, direction: undefined, offset: undefined, ...(stat.kind === "games" ? { mode } : {}) });
  const activeFilters = [share !== DEFAULT_SHARE, team, position, search].filter(Boolean).length;
  const resetFilters = () => update({ games: undefined, team: undefined, position: undefined, search: undefined, offset: undefined });
  const toggleOrder = () => update({ direction: direction === "asc" ? "desc" : "asc", offset: undefined });
  // The page buttons are under the list, so a new page brings the top of the list back into view.
  const listRef = useRef(null);
  const changePage = (nextOffset) => {
    update({ offset: nextOffset || undefined });
    listRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="flex flex-col gap-4">
      <LeadersToolbar>
        {stage}
        <StatSelect families={PLAYER_FAMILIES} stats={PLAYER_STATS} activeKey={stat.key} onChoose={chooseStat} />
        <ModeToggle ariaLabel="Player statistics mode" mode={mode} onChange={setMode} />
      </LeadersToolbar>
      {boardQuery.isPending || rule.isLoading ? (
        <AsyncState status="loading" label="Loading the player leaderboard" skeleton={<BoardSkeleton />} />
      ) : boardQuery.isError ? (
        <AsyncState status="error" message="Could not load the player leaderboard." onRetry={() => boardQuery.refetch()} />
      ) : (
        <Panel ref={listRef} className="scroll-mt-28 p-2 sm:p-3">
          <BoardBar
            summary={
              <>
                <span className="font-semibold">{shown.length ? `Showing ${offset + 1}-${offset + page.length} of ${shown.length} players` : "No players"}</span>
                <span className="muted">· {mode === "perGame" ? "per game" : "season totals"}</span>
              </>
            }
            note={
              stat.volume ? (
                <>
                  <p className="muted text-xs">Ranked among players with {volumeText(stat.volume, rule.rounds)}.</p>
                  <BehindNote rule={rule} className="muted text-xs" />
                </>
              ) : null
            }
            activeCount={activeFilters}
            onReset={resetFilters}
          >
            <BarSelect label="Minimum games played" value={share} onChange={(value) => update({ games: value === DEFAULT_SHARE ? undefined : value, offset: undefined })}>
              {GAME_SHARES.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {gameShareLabel(gamesSoFar, entry, moreThanSoFar)}
                </option>
              ))}
              <option value="all">Games: all players</option>
            </BarSelect>
            <BarSelect label="Team" value={team} onChange={(value) => update({ team: value || undefined, offset: undefined })}>
              <option value="">All teams</option>
              {teams.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </BarSelect>
            <BarSelect label="Position" value={position} onChange={(value) => update({ position: value || undefined, offset: undefined })}>
              <option value="">All positions</option>
              {positions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </BarSelect>
            <BarSearch label="Search players by name" placeholder="Search players" value={search} onChange={(value) => update({ search: value || undefined, offset: undefined })} />
          </BoardBar>
          {shown.length === 0 ? (
            <EmptyText>No players match these filters.</EmptyText>
          ) : (
            <>
              <BoardHeader columns={["GP", "MIN"]} valueLabel={stat.short} sort={{ direction, onToggle: toggleOrder }} />
              <motion.ol variants={listContainer} initial="hidden" animate="show" key={`${stat.key}-${mode}-${direction}-${offset}-${team}-${position}-${search}-${share}`}>
                {page.map(({ row, rank, value }) => {
                  const move = movement.get(row.personKey);
                  return (
                    <BoardRow
                      key={row.personKey}
                      rank={rank}
                      change={move && move.before !== null ? move.before - move.now : null}
                      avatar={<Avatar optimize imageUrl={row.playerImageUrl} size={BOARD_AVATAR} />}
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
              <BoardPager offset={offset} pageSize={PAGE_SIZE} total={shown.length} onChange={changePage} />
            </>
          )}
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
