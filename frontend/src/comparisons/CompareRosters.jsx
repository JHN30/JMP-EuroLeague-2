import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getSeasons, getSeasonTeams, getTeamPlayersAdvanced, getTeamRoster } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { ImpactRowsSkeleton, RostersSkeleton } from "./CompareSkeleton";
import EmptyText from "../lib/EmptyText";
import HeaderTip from "../lib/HeaderTip";
import { formatDecimal, formatPerGame } from "../lib/format";
import { barFill, listContainer, listItem, tableBody, tableRow } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { displayName, nameParts } from "../lib/playerName";
import { Avatar } from "../leaders/LeaderParts";
import { formatAdvancedValue } from "../leaders/leaderData";
import { advancedScopeForPhase } from "../teams/teamLeague";
import { fetchTeamRosterStats } from "../teams/teamRosterStats";
import { ROSTER_SUMMARY_TIPS } from "./statTips";
import { absentFromSeason } from "./teamCompare";
import useClubEntities from "./useClubEntities";

const ROSTER_LIMIT = 100;

function statNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

// One club's roster: each registered player with the season numbers, the biggest minutes first.
function buildRows(registrations, statsByPersonKey) {
  return registrations
    .map((entry) => {
      const stats = statsByPersonKey.get(entry.player?.personKey);
      const traditional = stats?.traditional;
      const games = statNumber(traditional?.gamesPlayed) ?? 0;
      return {
        key: entry.player?.personKey ?? `${entry.dorsal}-${entry.player?.name}`,
        personKey: entry.player?.personKey,
        name: entry.player?.name,
        dorsal: entry.dorsal,
        position: entry.positionName,
        country: entry.player?.countryCode,
        heightCm: statNumber(entry.player?.heightCm),
        weightKg: statNumber(entry.player?.weightKg),
        age: statNumber(stats?.playerAge),
        imageUrl: stats?.playerImageUrl,
        games,
        minutes: games > 0 ? statNumber(traditional?.minutesPlayed) : null,
        points: games > 0 ? statNumber(traditional?.pointsScored) : null,
        rebounds: games > 0 ? statNumber(traditional?.totalRebounds) : null,
        assists: games > 0 ? statNumber(traditional?.assists) : null,
        pir: games > 0 ? statNumber(traditional?.pir) : null,
      };
    })
    .map((row) => ({ ...row, totalMinutes: (row.minutes ?? 0) * row.games, totalPoints: (row.points ?? 0) * row.games }))
    .sort((a, b) => (b.minutes ?? -1) - (a.minutes ?? -1) || a.dorsal - b.dorsal);
}

function average(values) {
  const known = values.filter((value) => value !== null);
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0) / known.length;
}

const sumOf = (rows, field) => rows.reduce((sum, row) => sum + row[field], 0);
// A part of the club's total as a percentage; null when the club has none of it yet.
const shareOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : null);

// `lastKeys` is the set of players registered with the club last season, or null when there is no last season to compare.
function summarize(rows, lastKeys) {
  const topScorers = rows
    .map((row) => row.points)
    .filter((value) => value !== null)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const byTotal = [...rows].sort((a, b) => b.totalPoints - a.totalPoints);
  const points = sumOf(rows, "totalPoints");
  return {
    players: rows.length,
    age: average(rows.map((row) => row.age)),
    height: average(rows.map((row) => row.heightCm)),
    weight: average(rows.map((row) => row.weightKg)),
    nationalities: new Set(rows.map((row) => row.country).filter(Boolean)).size,
    topThree: topScorers.length === 0 ? null : topScorers.reduce((sum, value) => sum + value, 0),
    rotation: rows.filter((row) => (row.minutes ?? 0) >= 15).length,
    topShare: shareOf(byTotal[0]?.totalPoints ?? 0, points),
    topThreeShare: shareOf(sumOf(byTotal.slice(0, 3), "totalPoints"), points),
    doubleFigures: rows.filter((row) => (row.points ?? 0) >= 10).length,
    continuity: lastKeys ? shareOf(sumOf(rows.filter((row) => lastKeys.has(row.personKey)), "totalMinutes"), sumOf(rows, "totalMinutes")) ?? 0 : null,
  };
}

// The rows and their group headers share this grid, so the columns line up: name, A's number and bar, B's bar and number. Below sm the
// bars go and a row is the name and the two numbers, under the clubs' TV codes (the club code when a club has none).
const ROW_GRID = "grid items-center gap-x-2 grid-cols-[minmax(0,1fr)_4rem_4rem] sm:grid-cols-[11rem_3.5rem_1fr_1fr_3.5rem]";

function HalfBar({ share, side, better }) {
  return (
    <div aria-hidden="true" className="h-2 min-w-0 overflow-hidden rounded-full bg-base-300">
      <motion.div
        className={`h-full rounded-full ${better ? "bg-primary" : "bg-base-content/45"} ${side === "a" ? "ml-auto" : ""}`}
        style={{ width: `${share}%`, originX: side === "a" ? 1 : 0 }}
        {...barFill}
      />
    </div>
  );
}

// One measure for both clubs. Only a "higher" measure has a better side; the bars are each a share of the bigger number.
function ProfileRow({ row }) {
  const [a, b] = row.raw;
  const biggest = Math.max(a ?? 0, b ?? 0);
  const better = row.direction === "higher" && a !== null && b !== null && a !== b ? (a > b ? "a" : "b") : null;
  const share = (value) => (biggest > 0 && value !== null ? Math.max(4, (value / biggest) * 100) : 0);
  const tip = ROSTER_SUMMARY_TIPS[row.label];
  return (
    <motion.li variants={listItem} data-better={better ?? undefined} className={`${ROW_GRID} border-b border-base-300 py-1.5 text-sm last:border-0 sm:py-2`}>
      <span className="min-w-0 font-medium">{tip ? <HeaderTip tip={tip}>{row.label}</HeaderTip> : row.label}</span>
      <span className={`text-right font-semibold tabular-nums ${better === "a" ? "font-bold text-primary" : ""}`}>{row.show(a)}</span>
      <div className="max-sm:hidden">
        <HalfBar share={share(a)} side="a" better={better === "a"} />
      </div>
      <div className="max-sm:hidden">
        <HalfBar share={share(b)} side="b" better={better === "b"} />
      </div>
      <span className={`font-semibold tabular-nums max-sm:text-right sm:text-left ${better === "b" ? "font-bold text-primary" : ""}`}>{row.show(b)}</span>
    </motion.li>
  );
}

function ProfileGroup({ title, rows, entityA, entityB }) {
  return (
    <section aria-label={title}>
      <div aria-hidden="true" className={`${ROW_GRID} muted border-b border-base-300 pb-1 text-xs font-bold tracking-wide uppercase`}>
        <h3 className="text-base-content text-sm tracking-normal normal-case">{title}</h3>
        <span className="text-right sm:col-span-2 sm:text-center">
          <ShortLabel short={entityA.tvCode ?? entityA.id} full={entityA.label} />
        </span>
        <span className="text-right sm:col-span-2 sm:text-center">
          <ShortLabel short={entityB.tvCode ?? entityB.id} full={entityB.label} />
        </span>
      </div>
      <motion.ul variants={listContainer} initial="hidden" animate="show">
        {rows.map((row) => (
          <ProfileRow key={row.label} row={row} />
        ))}
      </motion.ul>
    </section>
  );
}

const percent = (value) => (value === null ? "—" : `${Math.round(value)}%`);

function RosterProfile({ a, b, entityA, entityB }) {
  const squad = [
    { label: "Players", raw: [a.players, b.players], show: (value) => value },
    { label: "Average age", raw: [a.age, b.age], show: (value) => formatDecimal(value) },
    { label: "Average height", raw: [a.height, b.height], show: (value) => (value === null ? "—" : `${Math.round(value)} cm`) },
    { label: "Average weight", raw: [a.weight, b.weight], show: (value) => (value === null ? "—" : `${Math.round(value)} kg`) },
    { label: "Nationalities", raw: [a.nationalities, b.nationalities], show: (value) => value },
    { label: "Players on 15+ minutes", raw: [a.rotation, b.rotation], show: (value) => value },
    ...(a.continuity !== null || b.continuity !== null ? [{ label: "Continuity", raw: [a.continuity, b.continuity], show: percent }] : []),
  ];
  const scoring = [
    { label: "Points of the top 3 scorers", raw: [a.topThree, b.topThree], show: (value) => formatPerGame(value), direction: "higher" },
    { label: "Top scorer's share", raw: [a.topShare, b.topShare], show: percent },
    { label: "Top three's share", raw: [a.topThreeShare, b.topThreeShare], show: percent },
    { label: "Players on 10+ points", raw: [a.doubleFigures, b.doubleFigures], show: (value) => value },
  ];
  return (
    <Panel as="section" aria-label="Rosters compared" className="h-full p-4">
      <PanelHeader compact level="h2" kicker="SQUADS" title="The two rosters" />
      <div className="flex flex-col gap-5">
        <ProfileGroup title="Squad" rows={squad} entityA={entityA} entityB={entityB} />
        <ProfileGroup title="Scoring spread" rows={scoring} entityA={entityA} entityB={entityB} />
      </div>
    </Panel>
  );
}

// A player's name in a pinned table cell: below sm the last name only (the full name stays for screen readers), from sm the full name.
function PlayerName({ name, to }) {
  const label = <ShortLabel short={nameParts(name).last} full={displayName(name)} />;
  const className = "block leading-tight font-semibold max-sm:max-w-24 max-sm:wrap-break-word";
  return to ? (
    <Link to={to} className={`${className} hover:underline`}>
      {label}
    </Link>
  ) : (
    <span className={className}>{label}</span>
  );
}

// ---- Position matchups ----

const POSITIONS = [
  { key: "Guard", title: "Guards" },
  { key: "Forward", title: "Forwards" },
  { key: "Center", title: "Centers" },
];

// A club's players at one position: the best of them by PIR per game among those who played, the group's share of the club's minutes and
// points, and its average age and height over everyone registered there.
function positionGroup(rows, position) {
  const group = rows.filter((row) => row.position === position);
  const best = group.filter((row) => row.games > 0 && row.pir !== null).sort((x, y) => y.pir - x.pir)[0] ?? null;
  return {
    count: group.length,
    best,
    minutes: shareOf(sumOf(group, "totalMinutes"), sumOf(rows, "totalMinutes")),
    points: shareOf(sumOf(group, "totalPoints"), sumOf(rows, "totalPoints")),
    age: average(group.map((row) => row.age)),
    height: average(group.map((row) => row.heightCm)),
    weight: average(group.map((row) => row.weightKg)),
  };
}

function BestPlayer({ player, alignEnd }) {
  if (!player) return <span className={`muted text-sm ${alignEnd ? "text-right" : ""}`}>—</span>;
  return (
    <span className={`flex min-w-0 items-center gap-2 ${alignEnd ? "flex-row-reverse text-right" : ""}`}>
      <Avatar imageUrl={player.imageUrl} size="h-8 w-8 flex-none" />
      <span className="min-w-0">
        <span className="block text-sm leading-tight font-semibold wrap-break-word">{displayName(player.name)}</span>
        <span className="muted block text-xs tabular-nums">{formatPerGame(player.pir)} PIR</span>
      </span>
    </span>
  );
}

// The group's facts for both clubs, each between the two numbers.
function PositionFacts({ a, b }) {
  const facts = [
    ["Players", a.count, b.count],
    ["Share of minutes", percent(a.minutes), percent(b.minutes)],
    ["Share of points", percent(a.points), percent(b.points)],
    ["Average age", formatDecimal(a.age), formatDecimal(b.age)],
    ["Average height", a.height === null ? "—" : `${Math.round(a.height)} cm`, b.height === null ? "—" : `${Math.round(b.height)} cm`],
    ["Average weight", a.weight === null ? "—" : `${Math.round(a.weight)} kg`, b.weight === null ? "—" : `${Math.round(b.weight)} kg`],
  ];
  return (
    <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 text-xs">
      {facts.map(([label, valueA, valueB]) => (
        <div key={label} className="contents">
          <span className="text-right font-semibold tabular-nums">{valueA}</span>
          <span className="muted text-center">{label}</span>
          <span className="font-semibold tabular-nums">{valueB}</span>
        </div>
      ))}
    </div>
  );
}

// Guards, forwards and centers side by side: each club's best player there (a link to their comparison when both have one) and how
// much of the club the position carries.
function PositionMatchups({ seasonCode, rowsA, rowsB }) {
  return (
    <Panel as="section" aria-label="Position matchups" className="h-full p-4">
      <PanelHeader compact level="h2" kicker="BY POSITION" title="Position matchups" />
      <p className="muted mb-2 text-xs">The best player at each position by PIR per game, over what the position group carries: its share of the club&apos;s minutes and points, its average age, height and weight.</p>
      <motion.ul className="flex flex-col" variants={listContainer} initial="hidden" animate="show">
        {POSITIONS.map((position) => {
          const a = positionGroup(rowsA, position.key);
          const b = positionGroup(rowsB, position.key);
          const body = (
            <>
              <span className="eyebrow col-span-2 block">{position.title}</span>
              <BestPlayer player={a.best} />
              <BestPlayer player={b.best} alignEnd />
              <PositionFacts a={a} b={b} />
            </>
          );
          const className = "grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-field px-2 py-2.5";
          return (
            <motion.li key={position.key} variants={listItem} className="border-b border-base-300 last:border-0">
              {a.best && b.best ? (
                <Link
                  to={`/${seasonCode}/compare?view=players&playerA=${encodeURIComponent(a.best.personKey)}&playerB=${encodeURIComponent(b.best.personKey)}`}
                  aria-label={`Compare ${displayName(a.best.name)} and ${displayName(b.best.name)}, the best ${position.title.toLowerCase()}`}
                  className={`${className} hover:bg-base-200`}
                >
                  {body}
                </Link>
              ) : (
                <div className={className}>{body}</div>
              )}
            </motion.li>
          );
        })}
      </motion.ul>
    </Panel>
  );
}

// ---- The most impactful players ----

const IMPACT_SHOWN = 5;
const IMPACT_COLUMNS = [
  { key: "per", label: "PER", format: "decimal", tip: "Player efficiency rating; the league average is 15" },
  { key: "winShares", label: "WS", format: "decimal2", tip: "Win Shares: how many of the team's wins the player is responsible for" },
  { key: "winSharesPer40", label: "WS/40", format: "decimal3", tip: "Win Shares per 40 minutes; about 0.100 is average" },
  { key: "usgPct", label: "USG%", format: "percent", tip: "Usage: the share of the team's possessions that end with the player" },
  { key: "tsPct", label: "TS%", format: "percent", tip: "True shooting percentage" },
  { key: "pie", label: "PIE", format: "pie", tip: "Player impact estimate" },
];

function ImpactTable({ seasonCode, entity, crestUrl, players, imageOf }) {
  const top = players
    .filter((player) => player.winShares !== null && player.winShares !== undefined)
    .sort((x, y) => Number(y.winShares) - Number(x.winShares))
    .slice(0, IMPACT_SHOWN);
  const best = top.length ? Number(top[0].winShares) : 0;
  return (
    <Panel className="p-3">
      <div className="mb-2 flex items-center gap-2">
        {crestUrl ? <RevealImage src={crestUrl} className="h-7 w-7 flex-none object-contain" /> : null}
        <h3 className="min-w-0 font-bold">{entity.label}</h3>
        <p className="muted ms-auto text-xs">Top {IMPACT_SHOWN} by Win Shares</p>
      </div>
      {top.length === 0 ? (
        <p className="muted text-sm">No advanced numbers for this club yet.</p>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="data-table-sticky table table-sm w-full [&_td]:py-1">
            <thead>
              <tr className="muted text-xs uppercase">
                <th>Player</th>
                {IMPACT_COLUMNS.map((column) => (
                  <th key={column.key} className="text-right" title={column.tip}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <motion.tbody variants={tableBody} initial="hidden" animate="show">
              {top.map((player) => {
                return (
                  <motion.tr key={player.personKey} variants={tableRow}>
                    <td>
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar imageUrl={imageOf(player.personKey)} size="h-7 w-7 max-sm:hidden" />
                        <div className="min-w-0 flex-1">
                          <PlayerName name={player.playerName} to={"/" + seasonCode + "/players/" + player.personKey} />
                          <div aria-hidden="true" className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-base-300 max-sm:w-full">
                            <div className="h-full rounded-full bg-primary" style={{ width: (best > 0 ? Math.max(6, (Number(player.winShares) / best) * 100) : 0) + "%" }} />
                          </div>
                        </div>
                      </div>
                    </td>
                    {IMPACT_COLUMNS.map((column) => (
                      <td key={column.key} className={"text-right tabular-nums " + (column.key === "winShares" ? "font-semibold" : "")}>
                        {formatAdvancedValue(column, player[column.key])}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function RosterTable({ seasonCode, entity, crestUrl, rows }) {
  const [showUnplayed, setShowUnplayed] = useState(false);
  const unplayed = rows.filter((row) => row.games === 0).length;
  const shown = showUnplayed ? rows : rows.filter((row) => row.games > 0);
  return (
    <Panel className="p-3">
      <div className="mb-2 flex items-center gap-2">
        {crestUrl ? <RevealImage src={crestUrl} className="h-7 w-7 flex-none object-contain" /> : null}
        <h3 className="min-w-0 font-bold">{entity.label}</h3>
        <p className="muted ms-auto text-xs">{rows.length} players · per game</p>
      </div>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="data-table-sticky table table-sm w-full [&_td]:py-1">
          <thead>
            <tr className="muted text-xs uppercase">
              <th>Player</th>
              <th className="text-right">GP</th>
              <th className="text-right">MIN</th>
              <th className="text-right">PTS</th>
              <th className="text-right">REB</th>
              <th className="text-right">AST</th>
              <th className="text-right">PIR</th>
            </tr>
          </thead>
          <motion.tbody variants={tableBody} initial="hidden" animate="show">
            {shown.map((row) => {
              const played = row.games > 0;
              // A player who has not played is dimmed cell by cell: dimming the row would let the swiped numbers show through the pinned player.
              return (
                <motion.tr key={row.key} variants={tableRow} className={played ? "" : "[&>td:not(:first-child)]:opacity-60"}>
                  <td>
                    <div className={`flex min-w-0 items-center gap-2 ${played ? "" : "opacity-60"}`}>
                      <span className="muted w-6 flex-none text-right tabular-nums">{row.dorsal ?? "—"}</span>
                      <Avatar imageUrl={row.imageUrl} size="h-7 w-7 max-sm:hidden" />
                      <div className="min-w-0">
                        <PlayerName name={row.name} to={row.personKey ? `/${seasonCode}/players/${row.personKey}` : null} />
                        <span className="muted block text-xs leading-tight max-sm:hidden">{[row.position, row.heightCm ? `${row.heightCm} cm` : null, row.weightKg ? `${row.weightKg} kg` : null].filter(Boolean).join(" · ")}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{played ? row.games : "—"}</td>
                  <td className="text-right tabular-nums">{formatPerGame(row.minutes)}</td>
                  <td className="text-right font-semibold tabular-nums">{formatPerGame(row.points)}</td>
                  <td className="text-right tabular-nums">{formatPerGame(row.rebounds)}</td>
                  <td className="text-right tabular-nums">{formatPerGame(row.assists)}</td>
                  <td className="text-right tabular-nums">{formatPerGame(row.pir)}</td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>
      {unplayed > 0 ? (
        <button type="button" className="btn btn-ghost btn-sm mt-2 w-full" aria-expanded={showUnplayed} onClick={() => setShowUnplayed((open) => !open)}>
          {showUnplayed ? `Hide the ${unplayed} who haven't played` : `Show ${unplayed} who haven't played`}
        </button>
      ) : null}
    </Panel>
  );
}

// The rosters of the two clubs side by side: a few facts about each squad, then every player with the season's numbers.
export default function CompareRosters({ seasonCode, phaseCode, entityA: pickedA, entityB: pickedB }) {
  const [entityA, entityB] = useClubEntities(seasonCode, pickedA, pickedB);
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const rosterA = useQuery({ queryKey: ["team-roster", seasonCode, entityA.id], queryFn: () => getTeamRoster(seasonCode, entityA.id, { limit: ROSTER_LIMIT }) });
  const rosterB = useQuery({ queryKey: ["team-roster", seasonCode, entityB.id], queryFn: () => getTeamRoster(seasonCode, entityB.id, { limit: ROSTER_LIMIT }) });
  const statsA = useQuery({
    queryKey: ["team-roster-stats", seasonCode, phaseCode, entityA.id],
    queryFn: () => fetchTeamRosterStats(seasonCode, phaseCode, entityA.id),
    enabled: Boolean(phaseCode),
  });
  const statsB = useQuery({
    queryKey: ["team-roster-stats", seasonCode, phaseCode, entityB.id],
    queryFn: () => fetchTeamRosterStats(seasonCode, phaseCode, entityB.id),
    enabled: Boolean(phaseCode),
  });

  // Last season, the one after this in the catalog (newest first): a club absent from it had no one to keep.
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: getSeasons });
  const seasons = seasonsQuery.data?.seasons ?? [];
  const index = seasons.findIndex((season) => season.seasonCode === seasonCode);
  const previous = index >= 0 ? (seasons[index + 1]?.seasonCode ?? null) : null;
  const lastRoster = (clubCode) => ({
    queryKey: ["team-roster", previous, clubCode],
    queryFn: () =>
      getTeamRoster(previous, clubCode, { limit: ROSTER_LIMIT }).catch((error) => {
        if (absentFromSeason(error)) return { registrations: [] };
        throw error;
      }),
    enabled: Boolean(previous),
    retry: false,
  });
  const lastA = useQuery(lastRoster(entityA.id));
  const lastB = useQuery(lastRoster(entityB.id));

  const scope = advancedScopeForPhase(phaseCode);
  const impactA = useQuery({ queryKey: ["team-players-advanced", seasonCode, entityA.id, scope], queryFn: () => getTeamPlayersAdvanced(seasonCode, entityA.id, { scope }), enabled: Boolean(phaseCode) && scope !== null });
  const impactB = useQuery({ queryKey: ["team-players-advanced", seasonCode, entityB.id, scope], queryFn: () => getTeamPlayersAdvanced(seasonCode, entityB.id, { scope }), enabled: Boolean(phaseCode) && scope !== null });

  const queries = [rosterA, rosterB, statsA, statsB];
  if (queries.some((query) => query.isPending)) return <AsyncState status="loading" label="Loading the rosters" skeleton={<RostersSkeleton />} />;
  if (queries.some((query) => query.isError)) {
    return <AsyncState status="error" message="Could not load the rosters." onRetry={() => queries.forEach((query) => query.isError && query.refetch())} />;
  }

  const registrationsA = rosterA.data.registrations ?? [];
  const registrationsB = rosterB.data.registrations ?? [];
  if (registrationsA.length === 0 && registrationsB.length === 0) return <EmptyText>No roster is registered for these clubs yet.</EmptyText>;

  const rowsA = buildRows(registrationsA, statsA.data);
  const rowsB = buildRows(registrationsB, statsB.data);
  const crestOf = (id) => (teamsQuery.data?.teams ?? []).find((team) => team.clubCode === id)?.crestUrl;

  const imageByKey = new Map([...rowsA, ...rowsB].map((row) => [row.personKey, row.imageUrl]));
  const imageOf = (personKey) => imageByKey.get(personKey);
  // Continuity only once both of last season's rosters are in; a failed request leaves the row out.
  const lastKeys = (query) => (previous && query.isSuccess ? new Set((query.data.registrations ?? []).map((entry) => entry.player?.personKey).filter(Boolean)) : null);
  const bothLast = lastKeys(lastA) && lastKeys(lastB);
  return (
    <div className="flex flex-col gap-6">
      {/* The squads beside the position matchups from xl, both ending on one line. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
        <RosterProfile a={summarize(rowsA, bothLast ? lastKeys(lastA) : null)} b={summarize(rowsB, bothLast ? lastKeys(lastB) : null)} entityA={entityA} entityB={entityB} />
        <PositionMatchups seasonCode={seasonCode} rowsA={rowsA} rowsB={rowsB} />
      </div>
      <section>
        <div className="mb-3">
          <p className="eyebrow mb-0.5">ADVANCED</p>
          <h2 className="text-lg font-bold">Most impactful players</h2>
          <p className="muted mt-1 text-sm">Running values after the latest round. Hover or tap a column for what it means.</p>
        </div>
        {impactA.isPending || impactB.isPending ? (
          <AsyncState status="loading" label="Loading the advanced numbers" skeleton={<ImpactRowsSkeleton />} />
        ) : impactA.isError || impactB.isError ? (
          <AsyncState
            status="error"
            message="Could not load the advanced numbers."
            inline
            onRetry={() => {
              impactA.refetch();
              impactB.refetch();
            }}
          />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
            <ImpactTable seasonCode={seasonCode} entity={entityA} crestUrl={crestOf(entityA.id)} players={impactA.data.players ?? []} imageOf={imageOf} />
            <ImpactTable seasonCode={seasonCode} entity={entityB} crestUrl={crestOf(entityB.id)} players={impactB.data.players ?? []} imageOf={imageOf} />
          </div>
        )}
      </section>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
        <RosterTable seasonCode={seasonCode} entity={entityA} crestUrl={crestOf(entityA.id)} rows={rowsA} />
        <RosterTable seasonCode={seasonCode} entity={entityB} crestUrl={crestOf(entityB.id)} rows={rowsB} />
      </div>
    </div>
  );
}
