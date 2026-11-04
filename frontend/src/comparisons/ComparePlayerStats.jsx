import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getLeagueTeamStats, getPlayerAdvanced, getPlayerSeasonStats, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { PlayerStatsSkeleton } from "./CompareSkeleton";
import HeaderTip from "../lib/HeaderTip";
import { barFill, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import { ADVANCED_STATS } from "../leaders/leaderDefs";
import { formatAdvancedValue } from "../leaders/leaderData";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "../players/leagueLeaderboard";
import { statNumber } from "../players/playerOverview";
import { formatSheetValue, leagueStanding, STAT_GROUPS, statValue } from "../players/playerStatDefs";
import { advancedScopeForPhase, ordinal } from "../teams/teamLeague";
import { chartNames } from "./playerLabels";
import PlayerPairHeader from "./PlayerPairHeader";
import { PLAYER_STAT_TIPS } from "./statTips";

// Each player's colour, as on the Overview's radar: A is the primary colour, B the accent.
const SIDE_TEXT = { a: "text-primary", b: "text-accent" };
const SIDE_BG = { a: "bg-primary", b: "bg-accent" };

// The on/off figure of a player is shown only from this many minutes on the floor, as on the player's Advanced tab.
const ON_OFF_MIN_SECONDS = 300 * 60;
// Which of the advanced endpoint's ranks answers each statistic (the on/off rank is filed under `onOffNet`).
const RANK_KEY = { onOff: "onOffNet" };
// The advanced rates the box score already has (true shooting, effective FG and the three rebound shares).
const RATES_IN_BOX_SCORE = new Set(["tsPct", "efgPct", "trbPct", "orbPct", "drbPct"]);
// Usage is a role, not a level of quality.
const STYLE_ADVANCED = new Set(["usgPct"]);

// Every row and group header share this grid, so the columns line up down the tab. Below sm a row is two lines: the stat name
// between the two places, then the two numbers with a bar each. From sm it is one line: name, A's place, number and bar, B's bar,
// number and place.
const ROW_GRID =
  "grid items-center gap-x-2 grid-cols-[3.25rem_1fr_1fr_3.25rem] sm:grid-cols-[9rem_2.75rem_3.75rem_1fr_1fr_3.75rem_2.75rem]";

// The percentile of a place among `of` players, the length of its bar.
const percentileOf = (place) => (place?.rank && place.of > 1 ? ((place.of - place.rank) / (place.of - 1)) * 100 : place?.rank ? 100 : null);

// "a", "b" or null: the side with the better number, for a stat that has a better end.
function betterSide(a, b, direction) {
  if (direction === "none" || direction === "style" || a === null || b === null || a === b) return null;
  return (direction === "lower" ? a < b : a > b) ? "a" : "b";
}

function HalfBar({ percentile, side, better }) {
  return (
    <div aria-hidden="true" className="bg-base-300 h-2 min-w-0 overflow-hidden rounded-full">
      {percentile === null ? null : (
        <motion.div
          className={`h-full rounded-full ${better ? SIDE_BG[side] : "bg-base-content/45"} ${side === "a" ? "ml-auto" : ""}`}
          style={{ width: `${Math.max(4, percentile)}%`, originX: side === "a" ? 1 : 0 }}
          {...barFill}
        />
      )}
    </div>
  );
}

// The player's place, a dash for one under the minimum games, or nothing for a row that is not ranked.
function Place({ place, className }) {
  if (place?.rank) {
    return (
      <span className={`muted text-xs tabular-nums ${className}`} title={`${ordinal(place.rank)} of ${place.of}`}>
        {ordinal(place.rank)}
      </span>
    );
  }
  return (
    <span className={`muted text-xs ${className}`} title={place?.unqualified ? "Under the minimum games" : undefined}>
      {place?.unqualified ? (
        <>
          <span aria-hidden="true">&mdash;</span>
          <span className="sr-only">Under the minimum games</span>
        </>
      ) : null}
    </span>
  );
}

// One stat of the two players on one line: `row` is { key, label, tip, direction, a, b } with each side { value, shown, place }.
function StatRow({ row }) {
  const better = betterSide(row.a.value, row.b.value, row.direction);
  // A row without league places (games played, the club's rows) has no bars, only its two numbers.
  const ranked = Boolean(row.a.place || row.b.place);
  const value = (side, className) => (
    <span className={`font-semibold tabular-nums ${better === side ? `font-bold ${SIDE_TEXT[side]}` : ""} ${className}`}>{row[side].shown}</span>
  );
  return (
    <motion.li variants={listItem} data-better={better ?? undefined} className={`${ROW_GRID} border-base-300 gap-y-0.5 border-b py-1.5 text-sm last:border-0`}>
      <span className="col-span-2 col-start-2 row-start-1 text-center text-xs font-bold tracking-wide uppercase sm:col-span-1 sm:col-start-1 sm:text-left sm:text-sm sm:font-medium sm:tracking-normal sm:normal-case">
        <HeaderTip tip={row.tip}>{row.label}</HeaderTip>
        {row.direction === "lower" ? (
          <span className="muted ms-1 font-normal" title="Lower is better">
            <span aria-hidden="true">&darr;</span>
            <span className="sr-only"> (lower is better)</span>
          </span>
        ) : null}
      </span>
      <Place place={row.a.place} className="col-start-1 row-start-1 sm:col-start-2" />
      {value("a", "col-start-1 row-start-2 text-right sm:col-start-3 sm:row-start-1")}
      <div className="col-start-2 row-start-2 sm:col-start-4 sm:row-start-1">
        {ranked ? <HalfBar percentile={percentileOf(row.a.place)} side="a" better={better === "a"} /> : null}
      </div>
      <div className="col-start-3 row-start-2 sm:col-start-5 sm:row-start-1">
        {ranked ? <HalfBar percentile={percentileOf(row.b.place)} side="b" better={better === "b"} /> : null}
      </div>
      {value("b", "col-start-4 row-start-2 text-left sm:col-start-6 sm:row-start-1")}
      <Place place={row.b.place} className="col-start-4 row-start-1 text-right sm:col-start-7" />
    </motion.li>
  );
}

// A group's title over the two players' names, then its rows; `body` replaces the rows while the group's data loads or fails.
function StatGroup({ title, rows, names, body }) {
  return (
    <section aria-label={title} className="mb-4">
      <div className={`${ROW_GRID} muted border-base-300 gap-y-0.5 border-b pb-1 text-xs font-semibold`}>
        <h3 className="text-base-content col-span-4 text-sm font-bold sm:col-span-1">{title}</h3>
        <span aria-hidden="true" className={`col-span-2 col-start-1 text-center sm:col-start-3 ${SIDE_TEXT.a}`}>{names[0]}</span>
        <span aria-hidden="true" className={`col-span-2 col-start-3 text-center sm:col-start-5 ${SIDE_TEXT.b}`}>{names[1]}</span>
      </div>
      {body ?? (
        <motion.ul variants={listContainer} initial="hidden" animate="show">
          {rows.map((row) => (
            <StatRow key={row.key} row={row} />
          ))}
        </motion.ul>
      )}
    </section>
  );
}

// ---- The box score (the player page's stat sheet) ----

function boxScoreGroups(rowA, rowB, league, mode) {
  return STAT_GROUPS.map((group) => ({
    title: group.title,
    column: group.column,
    rows: group.stats.map((stat) => {
      const side = (entry) => {
        const value = entry ? statValue(stat, entry, mode) : null;
        return { value, shown: formatSheetValue(stat, value, mode), place: entry && league ? leagueStanding(stat, league, entry, mode) : null };
      };
      const perGameTip = PLAYER_STAT_TIPS[stat.field];
      return {
        key: stat.key,
        label: stat.label,
        tip: stat.tip ?? (mode === "perGame" ? perGameTip : null) ?? stat.label,
        direction: stat.direction ?? "higher",
        a: side(rowA),
        b: side(rowB),
      };
    }),
  }));
}

// ---- The advanced numbers ----

function advancedValue(data, key) {
  if (!data) return null;
  const latest = data.rounds[data.rounds.length - 1];
  if (key === "per" || key === "winShares" || key === "winSharesPer40") return latest?.[key] ?? null;
  if (key === "rapm") return data.rapm?.rapm ?? null;
  if (key === "onOff") {
    const main = [...(data.onOff ?? [])].sort((x, y) => (y.onSeconds ?? 0) - (x.onSeconds ?? 0))[0];
    return main && (main.onSeconds ?? 0) >= ON_OFF_MIN_SECONDS ? main.netRatingDiff : null;
  }
  return data.extended?.values?.[key] ?? null;
}

function advancedPlace(data, key) {
  const rank = data?.ranks?.[RANK_KEY[key] ?? key] ?? data?.extended?.ranks?.[key] ?? null;
  return rank?.rank ? { rank: rank.rank, of: rank.of } : null;
}

function advancedRows(family, dataA, dataB) {
  return ADVANCED_STATS.filter((stat) => stat.family === family && !(family === "Rates" && RATES_IN_BOX_SCORE.has(stat.key))).map((stat) => {
    const side = (data) => {
      const raw = advancedValue(data, stat.key);
      return { value: raw === null ? null : Number(raw), shown: formatAdvancedValue(stat, raw), place: advancedPlace(data, stat.key) };
    };
    return {
      key: stat.key,
      label: family === "Per 100 possessions" ? `${stat.label} per 100` : stat.label,
      tip: stat.tip,
      direction: STYLE_ADVANCED.has(stat.key) ? "style" : stat.lowerIsBetter ? "lower" : "higher",
      a: side(dataA),
      b: side(dataB),
    };
    // A number neither player's feed has (the split of Win Shares is kept for teams only) is left out rather than shown as two dashes.
  }).filter((row) => row.a.value !== null || row.b.value !== null);
}

// ---- The club ----

const percent = (value) => (value === null ? "—" : `${value.toFixed(1)}%`);

// The player's club in the phase: its record and place, and the player's share of its minutes, points, rebounds and assists per game.
function clubRows(rowA, rowB, standings, teamStats) {
  const standingOf = (row) => standings.find((entry) => entry.clubCode === row?.clubCode)?.basic ?? null;
  const teamOf = (row) => teamStats.find((entry) => entry.clubCode === row?.clubCode) ?? null;
  const perGame = (row, field) => statNumber(row?.traditional?.[field]);
  const teamPerGame = (team, field) => (team?.gamesPlayed ? statNumber(team.own?.[field]) / team.gamesPlayed : null);
  const share = (row, field, teamField) => {
    const own = perGame(row, field);
    const team = teamPerGame(teamOf(row), teamField);
    return own === null || !team ? null : (own / team) * 100;
  };
  const record = (row) => {
    const basic = standingOf(row);
    return basic ? { value: basic.gamesWon / (basic.gamesPlayed || 1), shown: `${basic.gamesWon}-${basic.gamesLost}`, place: null } : { value: null, shown: "—", place: null };
  };
  const position = (row) => {
    const basic = standingOf(row);
    return basic?.position ? { value: -basic.position, shown: ordinal(basic.position), place: null } : { value: null, shown: "—", place: null };
  };
  const shareRow = (key, label, field, teamField, tip) => ({
    key,
    label,
    tip,
    direction: "higher",
    a: { value: share(rowA, field, teamField), shown: percent(share(rowA, field, teamField)), place: null },
    b: { value: share(rowB, field, teamField), shown: percent(share(rowB, field, teamField)), place: null },
  });
  const minutes = (row) => {
    const value = perGame(row, "minutesPlayed");
    return { value: value === null ? null : (value / 40) * 100, shown: percent(value === null ? null : (value / 40) * 100), place: null };
  };
  return [
    { key: "record", label: "Club record", tip: "The club's wins and losses in the phase", direction: "higher", a: record(rowA), b: record(rowB) },
    { key: "place", label: "Club place", tip: "The club's place in the phase's standings", direction: "higher", a: position(rowA), b: position(rowB) },
    { key: "minShare", label: "Minutes share", tip: "The player's minutes per game out of the 40 a game lasts", direction: "higher", a: minutes(rowA), b: minutes(rowB) },
    shareRow("ptsShare", "Points share", "pointsScored", "points", "The player's points per game as a share of the club's"),
    shareRow("rebShare", "Rebounds share", "totalRebounds", "totalRebounds", "The player's rebounds per game as a share of the club's"),
    shareRow("astShare", "Assists share", "assists", "assistances", "The player's assists per game as a share of the club's"),
  ];
}

// Every statistic of two players on one tab: the box score of the player page's stat sheet with places among the qualified players,
// the advanced numbers with their own places, and the players' clubs. The groups sit in two columns from xl.
export default function ComparePlayerStats({ seasonCode, phaseCode, mode, entityA, entityB }) {
  const scope = advancedScopeForPhase(phaseCode);
  const statsFor = (entity) => ({
    queryKey: ["player-compare-stats", seasonCode, phaseCode, mode, entity.id],
    queryFn: () => getPlayerSeasonStats(seasonCode, entity.id, { phase: phaseCode, mode }),
    enabled: Boolean(phaseCode),
  });
  const advancedFor = (entity) => ({
    queryKey: ["player-advanced", seasonCode, entity.id, scope, "extended"],
    queryFn: () => getPlayerAdvanced(seasonCode, entity.id, { scope, extended: true }),
    enabled: Boolean(phaseCode) && scope !== null,
  });
  const statsA = useQuery(statsFor(entityA));
  const statsB = useQuery(statsFor(entityB));
  const league = useQuery({ queryKey: leaderboardQueryKey(seasonCode, phaseCode, mode), queryFn: () => fetchLeagueLeaderboard(seasonCode, phaseCode, mode), enabled: Boolean(phaseCode) });
  const advancedA = useQuery(advancedFor(entityA));
  const advancedB = useQuery(advancedFor(entityB));
  const standings = useQuery({ queryKey: ["standings", seasonCode, phaseCode], queryFn: () => getSeasonStandings(seasonCode, phaseCode), enabled: Boolean(phaseCode) });
  const teamStats = useQuery({ queryKey: ["league-team-stats", seasonCode, phaseCode], queryFn: () => getLeagueTeamStats(seasonCode, phaseCode), enabled: Boolean(phaseCode) });

  if (statsA.isPending || statsB.isPending || league.isPending) return <AsyncState status="loading" label="Loading the comparison" skeleton={<PlayerStatsSkeleton />} />;
  if (statsA.isError || statsB.isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load the comparison."
        onRetry={() => {
          statsA.refetch();
          statsB.refetch();
        }}
      />
    );
  }

  const rowA = statsA.data.players?.[0] ?? null;
  const rowB = statsB.data.players?.[0] ?? null;
  const names = chartNames(rowA?.playerName ?? entityA.label, rowB?.playerName ?? entityB.label);
  const box = boxScoreGroups(rowA, rowB, league.isSuccess ? league.data : null, mode);

  // The advanced groups say inside themselves when their numbers are loading, missing or failed.
  let advancedBody = null;
  if (scope === null) advancedBody = <p className="muted py-2 text-sm">Advanced numbers are not kept for this phase.</p>;
  else if (advancedA.isPending || advancedB.isPending) advancedBody = <div aria-hidden="true" className="skeleton my-2 h-24 w-full" />;
  else if (advancedA.isError || advancedB.isError)
    advancedBody = (
      <div className="py-2">
        <AsyncState
          status="error"
          message="Could not load the advanced numbers."
          inline
          onRetry={() => {
            advancedA.refetch();
            advancedB.refetch();
          }}
        />
      </div>
    );
  else if (!advancedA.data.rounds.length && !advancedB.data.rounds.length) advancedBody = <p className="muted py-2 text-sm">Advanced numbers are not available for these players in this phase yet.</p>;
  const advancedData = advancedBody ? [null, null] : [advancedA.data, advancedB.data];
  const advanced = (title, family) => ({ title, rows: advancedBody ? [] : advancedRows(family, ...advancedData), body: advancedBody });

  // The club rows need the standings and the team totals; without them the group is left out.
  const club = standings.isSuccess && teamStats.isSuccess ? { title: "The club", rows: clubRows(rowA, rowB, standings.data.standings ?? [], teamStats.data.teams ?? []) } : null;

  // The two columns from xl. Groups are never split, so the columns cannot end level; measured on real pairs, this split leaves
  // them one or two rows apart, closer than any other order that keeps related groups together.
  const left = [...box.filter((group) => group.column === "left"), advanced("Impact", "Overall"), advanced("Per 100 possessions", "Per 100 possessions")];
  const right = [...box.filter((group) => group.column !== "left"), ...(club ? [club] : []), advanced("Rates", "Rates")];
  const column = (groups) => (
    <div className="flex min-w-0 flex-col">
      {groups.map((group) => (
        <StatGroup key={group.title} title={group.title} rows={group.rows} body={group.body} names={names} />
      ))}
    </div>
  );

  return (
    <Panel className="p-4">
      <PlayerPairHeader compact seasonCode={seasonCode} entityA={entityA} entityB={entityB} rowA={rowA} rowB={rowB} />
      <p className="muted border-base-300 mt-3 mb-4 border-t pt-2 text-center text-xs">
        Beside each value: the place among players with enough games. Hover or tap a name for what it means.
        {league.isError ? " The league places could not be loaded." : ""}
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-2 xl:gap-x-8">
        {column(left)}
        {column(right)}
      </div>
    </Panel>
  );
}
