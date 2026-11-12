import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { Link } from "react-router";
import AsyncState from "../lib/AsyncState";
import { TeamRosterSkeleton } from "./TeamPageSkeleton";
import EmptyText from "../lib/EmptyText";
import { getTeamPlayersAdvanced } from "../lib/api";
import { formatDecimal, formatMissing, formatPerGame } from "../lib/format";
import { EASE_OUT, cardHover, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PlayerPortrait from "../lib/PlayerPortrait";
import ShortLabel from "../lib/ShortLabel";
import { displayName, nameParts } from "../lib/playerName";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import StatBarCell from "../statistics/StatBarCell";
import { barWidthScale } from "../statistics/statBarScale";
import { ROSTER_TABLE_LEVELS, usesPerRound } from "./rosterTableColumns";
import { fetchTeamRosterStats, playedForOtherClubs } from "./teamRosterStats";

const MotionLink = m.create(Link);

const PANEL_ID = "team-roster-panel";
const VIEW_TABS = [
  { key: "cards", label: "Cards" },
  { key: "table", label: "Table" },
];
const POSITION_ORDER = ["Guard", "Forward", "Center"];
// The minutes bar is full at a full game.
const FULL_GAME_MINUTES = 40;

function statNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function jerseyNumber(entry) {
  const number = Number.parseInt(entry.dorsal, 10);
  return Number.isNaN(number) ? Number.POSITIVE_INFINITY : number;
}

function average(values) {
  const known = values.filter((value) => value !== null && value !== undefined && !Number.isNaN(value));
  return known.length === 0 ? null : { value: known.reduce((sum, value) => sum + value, 0) / known.length, count: known.length };
}

function groupByPosition(registrations) {
  const groups = new Map();
  for (const entry of registrations) {
    const position = entry.positionName ?? "Other";
    if (!groups.has(position)) groups.set(position, []);
    groups.get(position).push(entry);
  }
  const rank = (position) => {
    const index = POSITION_ORDER.indexOf(position);
    return index === -1 ? POSITION_ORDER.length : index;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([position, entries]) => ({ position, entries: entries.slice().sort((a, b) => jerseyNumber(a) - jerseyNumber(b)) }));
}

function Fact({ label, value, sub, className = "" }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {sub ? <span className="muted text-xs">{sub}</span> : null}
    </div>
  );
}

function RosterFacts({ registrations, statsByPersonKey }) {
  const age = average(registrations.map((entry) => statNumber(statsByPersonKey.get(entry.player?.personKey)?.playerAge)));
  const height = average(registrations.map((entry) => statNumber(entry.player?.heightCm)));
  const countries = [...new Set(registrations.map((entry) => entry.player?.countryCode).filter(Boolean))].sort();

  return (
    <Panel className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:flex sm:flex-wrap sm:gap-x-10">
      <Fact label="Players" value={registrations.length} />
      <Fact
        label="Average age"
        value={age ? formatDecimal(age.value) : "—"}
        sub={age && age.count < registrations.length ? `of the ${age.count} who have played` : null}
      />
      <Fact label="Average height" value={height ? `${Math.round(height.value)} cm` : "—"} />
      <Fact label="Nationalities" value={countries.length} sub={countries.join(" · ")} />
    </Panel>
  );
}

function RosterCard({ entry, stats, seasonCode }) {
  const { last, first } = nameParts(entry.player?.name);
  const traditional = stats?.traditional;
  const played = traditional && statNumber(traditional.gamesPlayed) > 0;
  const minutes = statNumber(traditional?.minutesPlayed);
  const details = [
    entry.player?.countryCode,
    entry.player?.heightCm ? `${entry.player.heightCm} cm` : null,
    statNumber(stats?.playerAge) ? `${stats.playerAge} yrs` : null,
  ].filter(Boolean);

  const body = (
    <>
      <PlayerPortrait imageUrl={stats?.playerImageUrl} className="w-20 sm:w-28" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2 sm:gap-1.5 sm:px-4 sm:py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="muted truncate text-[0.7rem] font-bold uppercase tracking-[0.18em]">{first}</p>
            <p className="truncate text-lg font-extrabold uppercase leading-tight" title={last}>{last}</p>
          </div>
          <p className="flex-none text-3xl font-black leading-none tabular-nums">
            <span className="muted mr-0.5 text-sm font-bold">#</span>
            {entry.dorsal ?? "-"}
          </p>
        </div>
        <p className="muted truncate text-xs">{details.join(" · ")}</p>
        {played ? (
          <>
            <p className="flex flex-wrap gap-x-3 text-xs">
              <span>
                <b className="tabular-nums">{formatPerGame(statNumber(traditional.pointsScored))}</b> <span className="muted">PTS</span>
              </span>
              <span>
                <b className="tabular-nums">{formatPerGame(statNumber(traditional.totalRebounds))}</b> <span className="muted">REB</span>
              </span>
              <span>
                <b className="tabular-nums">{formatPerGame(statNumber(traditional.assists))}</b> <span className="muted">AST</span>
              </span>
            </p>
            <div className="flex items-center gap-2" title={`${formatPerGame(minutes)} minutes a game`}>
              <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-300">
                <m.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((minutes ?? 0) / FULL_GAME_MINUTES) * 100)}%` }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}
                />
              </div>
              <span className="muted w-14 flex-none text-right text-xs tabular-nums">{formatPerGame(minutes)} min</span>
            </div>
          </>
        ) : null}
      </div>
    </>
  );

  const className =
    "group flex min-h-28 overflow-hidden rounded-box sm:min-h-34 border border-base-300 bg-base-100 transition-colors hover:border-primary";
  return entry.player ? (
    <MotionLink to={`/${seasonCode}/players/${entry.player.personKey}`} className={className} variants={listItem} {...cardHover}>
      {body}
    </MotionLink>
  ) : (
    <m.div className={className} variants={listItem}>
      {body}
    </m.div>
  );
}

const COACH_ROLES = { E: "Head coach", A: "Assistant coach" };

// A coach has no photo, number or statistics in the data, only a name and a nationality, so each coach is one line: the name,
// the role and the country.
function CoachLine({ coach }) {
  return (
    <m.li
      className="flex min-w-0 items-baseline gap-2 rounded-field border border-base-300 bg-base-100 px-3 py-2 text-sm"
      variants={listItem}
    >
      <span className="truncate font-semibold" title={displayName(coach.name)}>
        {displayName(coach.name)}
      </span>
      <span className="flex-none text-xs font-bold uppercase tracking-wide text-primary">{COACH_ROLES[coach.roleCode] ?? "Staff"}</span>
      {coach.countryCode ? <span className="muted flex-none text-xs">{coach.countryCode}</span> : null}
    </m.li>
  );
}

function CoachingStaff({ coaches }) {
  if (coaches.length === 0) return null;
  return (
    <section aria-label="Coaching staff">
      <h3 className="mb-3 flex items-baseline gap-2 text-xl font-bold">
        Coaching staff
        <span className="muted text-sm font-semibold">{coaches.length}</span>
      </h3>
      <m.ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" variants={listContainer} initial="hidden" animate="show">
        {coaches.map((coach) => (
          <CoachLine key={`${coach.roleCode}-${coach.personKey}`} coach={coach} />
        ))}
      </m.ul>
    </section>
  );
}

// The players of a position who have not played yet, as one line of links instead of cards with an empty photo and no numbers.
function NotPlayedLine({ entries, seasonCode, afterCards }) {
  if (entries.length === 0) return null;
  return (
    <p className={`muted text-sm ${afterCards ? "mt-3" : ""}`}>
      <span className="font-semibold">Not played yet:</span>{" "}
      {entries.map((entry, index) => {
        const label = `#${entry.dorsal ?? "-"} ${displayName(entry.player?.name ?? "")}`.trim();
        return (
          <span key={entry.registrationKey}>
            {index > 0 ? ", " : null}
            {entry.player ? (
              <Link to={`/${seasonCode}/players/${entry.player.personKey}`} className="link link-hover whitespace-nowrap">
                {label}
              </Link>
            ) : (
              <span className="whitespace-nowrap">{label}</span>
            )}
          </span>
        );
      })}
    </p>
  );
}

function hasPlayed(stats) {
  return statNumber(stats?.traditional?.gamesPlayed) > 0;
}

function RosterCards({ registrations, statsByPersonKey, coaches, seasonCode }) {
  return (
    <div className="flex flex-col gap-8">
      {groupByPosition(registrations).map(({ position, entries }) => {
        const played = entries.filter((entry) => hasPlayed(statsByPersonKey.get(entry.player?.personKey)));
        const notPlayed = entries.filter((entry) => !played.includes(entry));
        return (
          <section key={position} aria-label={position}>
            <h3 className="mb-3 flex items-baseline gap-2 text-xl font-bold">
              {position}
              <span className="muted text-sm font-semibold">{entries.length}</span>
            </h3>
            {played.length > 0 ? (
              <m.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" variants={listContainer} initial="hidden" animate="show">
                {played.map((entry) => (
                  <RosterCard
                    key={entry.registrationKey}
                    entry={entry}
                    stats={statsByPersonKey.get(entry.player?.personKey)}
                    seasonCode={seasonCode}
                  />
                ))}
              </m.div>
            ) : null}
            <NotPlayedLine entries={notPlayed} seasonCode={seasonCode} afterCards={played.length > 0} />
          </section>
        );
      })}
      <CoachingStaff coaches={coaches} />
    </div>
  );
}

const LOADING_MARK = "…";
const DEFAULT_GROUPS = { traditional: "overview", advanced: "efficiency" };
const MODE_TABS = [
  { key: "perGame", label: "Per game" },
  { key: "accumulated", label: "Totals" },
];
const TABLE_PANEL_ID = "team-roster-table";

// The arrow after a sorted column's name; hidden from screen readers, which hear aria-sort instead.
function SortArrow({ direction }) {
  if (!direction) return null;
  return (
    <span aria-hidden="true" className="ms-0.5 text-primary">
      {direction === "descending" ? "↓" : "↑"}
    </span>
  );
}

// Every number the league and the per-round tables hold for the club's players, in two levels of groups. The first column
// (number, photo, name) stays pinned while the rest scrolls inside the panel. Totals and the per-round (Advanced) figures load
// the first time they are chosen; the season's per-game feed is already loaded for the tab.
function RosterTable({ registrations, statsByPersonKey, seasonCode, clubCode }) {
  const [levelKey, setLevelKey] = useState("traditional");
  const [groupKeys, setGroupKeys] = useState(DEFAULT_GROUPS);
  const [mode, setMode] = useState("perGame");
  const [sort, setSort] = useState(null);

  const level = ROSTER_TABLE_LEVELS.find((entry) => entry.key === levelKey);
  const group = level.groups.find((entry) => entry.key === groupKeys[levelKey]);
  // Totals apply to the Traditional numbers; the Advanced rates read the per-game feed, where they are the same.
  const tableMode = levelKey === "traditional" ? mode : "perGame";

  const totalsQuery = useQuery({
    queryKey: ["team-roster-stats", seasonCode, "all", clubCode, "accumulated"],
    queryFn: () => fetchTeamRosterStats(seasonCode, "all", clubCode, "accumulated"),
    enabled: tableMode === "accumulated",
  });
  const perRoundQuery = useQuery({
    queryKey: ["team-players-advanced", seasonCode, clubCode, "all"],
    queryFn: () => getTeamPlayersAdvanced(seasonCode, clubCode, { scope: "all" }),
    enabled: levelKey === "advanced",
  });

  const feed = tableMode === "accumulated" ? totalsQuery.data : statsByPersonKey;
  const feedPending = tableMode === "accumulated" && totalsQuery.isPending;
  const perRoundByKey = new Map((perRoundQuery.data?.players ?? []).map((player) => [player.personKey, player]));
  const needsPerRound = group.columns.some(usesPerRound);
  const perRoundPending = needsPerRound && perRoundQuery.isPending;

  const rows = registrations.map((entry) => {
    const key = entry.player?.personKey;
    const context = { stats: key ? feed?.get(key) : undefined, advanced: key ? perRoundByKey.get(key) : undefined };
    return { entry, context, photo: key ? statsByPersonKey.get(key)?.playerImageUrl : null };
  });
  const sortColumn = sort ? group.columns.find((column) => column.key === sort.key) : null;
  if (sortColumn) {
    const factor = sort.direction === "descending" ? -1 : 1;
    rows.sort((a, b) => {
      const valueA = sortColumn.get(a.context);
      const valueB = sortColumn.get(b.context);
      // Players without the number stay at the bottom whichever way the column is sorted.
      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return 1;
      if (valueB === null) return -1;
      return (valueA - valueB) * factor;
    });
  }

  function sortBy(column) {
    const first = column.fewestFirst ? "ascending" : "descending";
    setSort((current) =>
      current?.key === column.key
        ? { key: column.key, direction: current.direction === "descending" ? "ascending" : "descending" }
        : { key: column.key, direction: first },
    );
  }

  const cellText = (column, context) => {
    if ((usesPerRound(column) ? perRoundPending : feedPending)) return LOADING_MARK;
    return column.format(column.get(context), tableMode);
  };
  const traded = registrations
    .filter((entry) => entry.player && playedForOtherClubs(statsByPersonKey.get(entry.player.personKey), clubCode))
    .map((entry) => displayName(entry.player.name));
  const barScales = Object.fromEntries(
    group.columns.filter((column) => column.bar).map((column) => [column.key, barWidthScale(rows.map((row) => column.get(row.context)))]),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <TabStrip
          ariaLabel="Table numbers"
          panelId={TABLE_PANEL_ID}
          activeKey={levelKey}
          onChange={setLevelKey}
          tabs={ROSTER_TABLE_LEVELS.map((entry) => ({ key: entry.key, label: entry.label }))}
          className="w-fit"
        />
        {levelKey === "traditional" ? (
          <TabStrip ariaLabel="Per game or totals" panelId={TABLE_PANEL_ID} activeKey={mode} onChange={setMode} tabs={MODE_TABS} level={2} className="w-fit" />
        ) : null}
      </div>
      <TabStrip
        ariaLabel="Stat group"
        panelId={TABLE_PANEL_ID}
        scrolling
        activeKey={group.key}
        onChange={(key) => setGroupKeys((current) => ({ ...current, [levelKey]: key }))}
        tabs={level.groups.map((entry) => ({ key: entry.key, label: entry.label }))}
        level={2}
        className="mb-3 max-w-full"
      />
      {tableMode === "accumulated" && totalsQuery.isError ? (
        <AsyncState status="error" message="Could not load the season totals." onRetry={() => totalsQuery.refetch()} />
      ) : null}
      {needsPerRound && perRoundQuery.isError ? (
        <AsyncState status="error" message="Could not load the advanced figures." onRetry={() => perRoundQuery.refetch()} />
      ) : null}
      <TabPanel id={TABLE_PANEL_ID} focusKey={`${levelKey}-${group.key}-${tableMode}`} scroll={false}>
        {/* No left padding below sm: the pinned column sticks to the panel's padding edge, so a gap there showed the cells scrolling past it. */}
        <Panel className="overflow-x-auto overscroll-x-contain p-2 max-sm:pl-0">
          {/* Below sm the text is 12px. The pinned column sits above the bars' numbers (which are positioned, with their own z-index), so
              a number no longer shows through it while the table is swiped. */}
          <table className="data-table-sticky table max-sm:text-xs [&_tbody_td:first-child]:z-2!">
            <thead>
              <tr>
                <th className="max-sm:px-2">Player</th>
                {group.position ? <th>Position</th> : null}
                {group.columns.map((column) => {
                  const direction = sort?.key === column.key ? sort.direction : null;
                  return (
                    <th key={column.key} aria-sort={direction ?? undefined} className="whitespace-nowrap">
                      <button type="button" className="cursor-pointer whitespace-nowrap hover:text-primary" title={column.title} onClick={() => sortBy(column)}>
                        {column.label}
                        <span className="sr-only"> ({column.title})</span>
                        <SortArrow direction={direction} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ entry, context, photo }) => {
                const isFormer = entry.active === false;
                return (
                  <tr key={entry.registrationKey}>
                    <td className="max-sm:px-2">
                      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                        <span className="w-6 flex-none text-center text-xs text-base-content/60">{entry.dorsal ?? formatMissing(null)}</span>
                        {photo ? (
                          <img
                            src={photo}
                            alt=""
                            className="aspect-3/4 h-8 w-auto flex-none object-contain object-bottom max-sm:hidden"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        <div className="min-w-0">
                          {/* The "Former" badge sits under the name below sm, so it does not widen the pinned column. */}
                          <div className="flex items-center gap-1 max-sm:flex-col max-sm:items-start max-sm:gap-0">
                            {entry.player ? (
                              <Link
                                to={`/${seasonCode}/players/${entry.player.personKey}`}
                                className="link link-hover max-w-20 truncate sm:max-w-48"
                                title={displayName(entry.player.name ?? "TBD")}
                              >
                                {/* Below sm the pinned column has room for the last name only; the full name stays for screen readers. */}
                                <ShortLabel short={nameParts(entry.player.name).last} full={displayName(entry.player.name ?? "TBD")} />
                              </Link>
                            ) : (
                              <span className="max-w-32 truncate sm:max-w-48">TBD</span>
                            )}
                            {isFormer ? <span className="badge badge-ghost badge-xs">Former</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    {group.position ? <td>{entry.positionName ?? formatMissing(null)}</td> : null}
                    {group.columns.map((column) =>
                      column.bar ? (
                        <StatBarCell key={column.key} widthPct={barScales[column.key](column.get(context))}>
                          <span className="text-primary font-semibold tabular-nums">{cellText(column, context)}</span>
                        </StatBarCell>
                      ) : (
                        <td key={column.key} className="tabular-nums">
                          {cellText(column, context)}
                        </td>
                      ),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </TabPanel>
      <p className="muted mt-2 text-sm">
        The whole season, every stage. Click a column to sort; click again to reverse. Hover a column name for what it counts.
        {traded.length > 0
          ? ` ${new Intl.ListFormat("en", { type: "conjunction" }).format(traded)} also played for another club this season: the league's numbers cover all their games, while the Advanced figures that come from the club's own games (usage, PER, win shares, on/off and the per-100 numbers) are this club's only.`
          : ""}
      </p>
    </div>
  );
}

// The squad grouped by position, in the style of the EuroLeague roster page: portrait, name and number, with a slim
// stat line and a minutes bar added. The Table view holds every number, in groups.
export default function TeamRosterSection({ rosterQuery, rosterStatsQuery, coachesQuery, seasonCode, clubCode }) {
  const [view, setView] = useState("cards");

  if (rosterQuery.isPending) return <AsyncState status="loading" label="Loading the roster" skeleton={<TeamRosterSkeleton />} />;
  if (rosterQuery.isError) {
    return <AsyncState status="error" message="Could not load the roster." onRetry={() => rosterQuery.refetch()} />;
  }
  const registrations = rosterQuery.data.registrations ?? [];
  if (registrations.length === 0) {
    return <EmptyText>Roster not available yet.</EmptyText>;
  }
  if (rosterStatsQuery.isPending) return <AsyncState status="loading" label="Loading roster statistics" skeleton={<TeamRosterSkeleton />} />;
  if (rosterStatsQuery.isError) {
    return <AsyncState status="error" message="Could not load roster statistics." onRetry={() => rosterStatsQuery.refetch()} />;
  }

  const statsByPersonKey = rosterStatsQuery.data ?? new Map();
  // The coaches load on their own: if they are slow, missing or fail, the players still show.
  const coaches = coachesQuery?.data?.coaches ?? [];

  return (
    <div>
      <RosterFacts registrations={registrations} statsByPersonKey={statsByPersonKey} />
      <TabStrip ariaLabel="Roster view" panelId={PANEL_ID} activeKey={view} onChange={setView} tabs={VIEW_TABS} className="mb-4 w-fit" />
      <TabPanel id={PANEL_ID} focusKey={view} scroll={false}>
        {view === "cards" ? (
          <RosterCards registrations={registrations} statsByPersonKey={statsByPersonKey} coaches={coaches} seasonCode={seasonCode} />
        ) : (
          <RosterTable registrations={registrations} statsByPersonKey={statsByPersonKey} seasonCode={seasonCode} clubCode={clubCode} />
        )}
      </TabPanel>
    </div>
  );
}
