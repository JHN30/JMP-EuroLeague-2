import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatCount, formatDecimal, formatPerGame } from "../lib/format";
import { EASE_OUT, cardHover, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PlayerPortrait from "../lib/PlayerPortrait";
import ShortLabel from "../lib/ShortLabel";
import { nameParts, withoutComma } from "../lib/playerName";
import { formatStatValue } from "../lib/statsFields";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import StatBarCell from "../statistics/StatBarCell";
import { barWidthScale } from "../statistics/statBarScale";

const MotionLink = motion.create(Link);

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
            <p className="truncate text-lg font-extrabold uppercase leading-tight">{last}</p>
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
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((minutes ?? 0) / FULL_GAME_MINUTES) * 100)}%` }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}
                />
              </div>
              <span className="muted w-14 flex-none text-right text-xs tabular-nums">{formatPerGame(minutes)} min</span>
            </div>
          </>
        ) : (
          <p className="muted text-xs">Has not played yet</p>
        )}
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
    <motion.div className={className} variants={listItem}>
      {body}
    </motion.div>
  );
}

const COACH_ROLES = { E: "Head coach", A: "Assistant coach" };

// A coach has no photo, number or statistics in the data, only a name and a nationality, so the card is the player card
// without the numbers.
function CoachCard({ coach }) {
  const { last, first } = nameParts(coach.name);
  return (
    <motion.div
      className="flex overflow-hidden rounded-box border border-base-300 bg-base-100 sm:min-h-34"
      variants={listItem}
    >
      {/* A coach has no photo, so below sm the card is only the text. */}
      <PlayerPortrait imageUrl={null} className="w-24 sm:w-28 max-sm:hidden" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2 sm:gap-1.5 sm:px-4 sm:py-3">
        <p className="muted truncate text-[0.7rem] font-bold uppercase tracking-[0.18em]">{first}</p>
        <p className="truncate text-lg font-extrabold uppercase leading-tight">{last}</p>
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          {COACH_ROLES[coach.roleCode] ?? "Staff"}
          {coach.countryCode ? <span className="muted sm:hidden"> · {coach.countryCode}</span> : null}
        </p>
        {coach.countryCode ? <p className="muted text-xs max-sm:hidden">{coach.countryCode}</p> : null}
      </div>
    </motion.div>
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
      <motion.div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {coaches.map((coach) => (
          <CoachCard key={`${coach.roleCode}-${coach.personKey}`} coach={coach} />
        ))}
      </motion.div>
    </section>
  );
}

function RosterCards({ registrations, statsByPersonKey, coaches, seasonCode }) {
  return (
    <div className="flex flex-col gap-8">
      {groupByPosition(registrations).map(({ position, entries }) => (
        <section key={position} aria-label={position}>
          <h3 className="mb-3 flex items-baseline gap-2 text-xl font-bold">
            {position}
            <span className="muted text-sm font-semibold">{entries.length}</span>
          </h3>
          <motion.div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {entries.map((entry) => (
              <RosterCard
                key={entry.registrationKey}
                entry={entry}
                stats={statsByPersonKey.get(entry.player?.personKey)}
                seasonCode={seasonCode}
              />
            ))}
          </motion.div>
        </section>
      ))}
      <CoachingStaff coaches={coaches} />
    </div>
  );
}

function RosterTable({ registrations, statsByPersonKey, seasonCode }) {
  const barScale = barWidthScale(
    registrations.map((entry) => statNumber(statsByPersonKey.get(entry.player?.personKey)?.traditional?.pointsScored)),
  );

  // No left padding below sm: the pinned column sticks to the panel's padding edge, so a gap there showed the cells scrolling past it.
  return (
    <Panel className="overflow-x-auto overscroll-x-contain p-2 max-sm:pl-0">
      {/* Below sm the text is 12px. The pinned column sits above the points bar's number (which is positioned, with its own z-index), so
          the number no longer shows through it while the table is swiped. */}
      <table className="data-table-sticky table max-sm:text-xs [&_tbody_td:first-child]:z-2!">
        <thead>
          <tr>
            <th className="max-sm:px-2">Player</th>
            <th>Position</th>
            <th>GP</th>
            <th>MIN</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>PIR</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((entry) => {
            const stats = entry.player ? statsByPersonKey.get(entry.player.personKey) : undefined;
            const traditional = stats?.traditional;
            const pts = statNumber(traditional?.pointsScored);
            const isFormer = entry.active === false;
            return (
              <tr key={entry.registrationKey}>
                <td className="max-sm:px-2">
                  <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <span className="w-6 flex-none text-center text-xs text-base-content/60">{entry.dorsal ?? "-"}</span>
                    {stats?.playerImageUrl ? (
                      <img
                        src={stats.playerImageUrl}
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
                            title={withoutComma(entry.player.name ?? "TBD")}
                          >
                            {/* Below sm the pinned column has room for the last name only; the full name stays for screen readers. */}
                            <ShortLabel short={nameParts(entry.player.name).last} full={withoutComma(entry.player.name ?? "TBD")} />
                          </Link>
                        ) : (
                          <span className="max-w-32 truncate sm:max-w-48">TBD</span>
                        )}
                        {isFormer ? <span className="badge badge-ghost badge-xs">Former</span> : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{entry.positionName ?? "-"}</td>
                {/* Games played is a whole number; the per-game endpoint writes it as "3.0". */}
                <td>{traditional?.gamesPlayed != null ? formatCount(traditional.gamesPlayed) : "-"}</td>
                <td>{formatStatValue("minutesPlayed", traditional?.minutesPlayed)}</td>
                <StatBarCell widthPct={barScale(pts)}>
                  <span className="text-primary font-semibold tabular-nums">
                    {formatStatValue("pointsScored", traditional?.pointsScored)}
                  </span>
                </StatBarCell>
                <td>{traditional?.totalRebounds ?? "-"}</td>
                <td>{traditional?.assists ?? "-"}</td>
                <td>{traditional?.pir ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

// The squad grouped by position, in the style of the EuroLeague roster page: portrait, name and number, with a slim
// stat line and a minutes bar added. The Table view keeps the full per-game columns.
export default function TeamRosterSection({ rosterQuery, rosterStatsQuery, coachesQuery, seasonCode }) {
  const [view, setView] = useState("cards");

  if (rosterQuery.isPending) return <AsyncState status="loading" label="Loading the roster" />;
  if (rosterQuery.isError) {
    return <AsyncState status="error" message="Could not load the roster." onRetry={() => rosterQuery.refetch()} />;
  }
  const registrations = rosterQuery.data.registrations ?? [];
  if (registrations.length === 0) {
    return <EmptyText>Roster not available yet.</EmptyText>;
  }
  if (rosterStatsQuery.isPending) return <AsyncState status="loading" label="Loading roster statistics" />;
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
          <RosterTable registrations={registrations} statsByPersonKey={statsByPersonKey} seasonCode={seasonCode} />
        )}
      </TabPanel>
    </div>
  );
}
