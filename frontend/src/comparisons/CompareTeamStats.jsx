import { m } from "motion/react";
import AsyncState from "../lib/AsyncState";
import { TeamStatsSkeleton } from "./CompareSkeleton";
import EmptyText from "../lib/EmptyText";
import ForfeitStatsNote from "../lib/ForfeitStatsNote";
import HeaderTip from "../lib/HeaderTip";
import { barFill, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import ShortLabel from "../lib/ShortLabel";
import { formatTeamValue, UNADJUSTED_NOTE, usable, useTeamRows } from "../leaders/teamData";
import { ordinal, rankTier } from "../teams/teamLeague";
import useClubEntities from "./useClubEntities";
import { TEAM_STAT_TIPS } from "./statTips";
import { STAT_FAMILY_ORDER, directionOf, placeOn, statsOfFamily } from "./teamCompare";

// The families of the left column from xl; the rest go on the right, so the two end on about the same line.
const LEFT_FAMILIES = new Set(["Efficiency", "Record", "Scoring", "Shooting"]);

// Every row and every group header share this grid, so the columns line up down the tab. On a phone a row is two lines: the
// stat name centred between the two clubs' ranks, then the two numbers with a bar each between them. From sm it is one line:
// name, A's rank, A's number and bar, B's bar, number and rank.
const ROW_GRID =
  "grid items-center gap-x-2 grid-cols-[3.25rem_1fr_1fr_3.25rem] sm:grid-cols-[8.5rem_2.25rem_3.5rem_1fr_1fr_3.5rem_2.25rem] lg:grid-cols-[11rem_2.25rem_3.5rem_1fr_1fr_3.5rem_2.25rem]";

// How far along the league the value is, from the worst club (0) to the best (100), so a longer bar is always the better
// number, close values still differ, and negative ones (net rating, margin) have a length. A style stat (pace, attempts)
// has no better end: the most is the full bar. The worst club keeps a sliver so its bar is not empty.
function leagueShare(rows, stat, value) {
  if (value === null || value === undefined) return 0;
  const values = rows.map((row) => stat.get(row, "perGame")).filter((entry) => entry !== null && entry !== undefined && !Number.isNaN(entry));
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return 100;
  const share = ((value - low) / (high - low)) * 100;
  return Math.max(6, stat.lowerIsBetter ? 100 - share : share);
}

// "a", "b", "level" or null (a style stat such as pace, or a side without a value): which club has the better number on a stat.
function betterSide(stat, a, b) {
  if (directionOf(stat) === "neutral" || a === null || b === null) return null;
  if (a === b) return "level";
  return (stat.lowerIsBetter ? a < b : a > b) ? "a" : "b";
}

// One half of the butterfly: A's grows left from the middle, B's right.
function HalfBar({ share, side, better }) {
  return (
    <div aria-hidden="true" className="h-2 min-w-0 overflow-hidden rounded-full bg-base-300">
      <m.div
        className={`h-full rounded-full ${better ? "bg-primary" : "bg-base-content/45"} ${side === "a" ? "ml-auto" : ""}`}
        style={{ width: `${share}%`, originX: side === "a" ? 1 : 0 }}
        {...barFill}
      />
    </div>
  );
}

function Rank({ place, neutral, className }) {
  if (!place) return <span className={className} />;
  return (
    <span className={`text-xs font-bold tabular-nums ${neutral ? "muted" : rankTier(place).text} ${className}`} title={`${ordinal(place.rank)} of ${place.of} clubs`}>
      {ordinal(place.rank)}
    </span>
  );
}

function Value({ stat, place, better, className }) {
  return <span className={`font-semibold tabular-nums ${better ? "font-bold text-primary" : ""} ${className}`}>{formatTeamValue(stat, place?.value, "perGame")}</span>;
}

function StatRow({ row, rows }) {
  const { stat, a, b, better } = row;
  const neutral = directionOf(stat) === "neutral";
  const tip = stat.tip ?? TEAM_STAT_TIPS[stat.key];
  return (
    <m.li variants={listItem} data-better={better ?? undefined} className={`${ROW_GRID} gap-y-0.5 border-b border-base-300 py-2 text-sm last:border-0`}>
      <span className="col-span-2 col-start-2 row-start-1 text-center text-xs font-bold tracking-wide uppercase sm:col-span-1 sm:col-start-1 sm:text-left sm:text-sm sm:font-medium sm:tracking-normal sm:normal-case">
        {tip ? <HeaderTip tip={tip}>{stat.label}</HeaderTip> : stat.label}
        {stat.lowerIsBetter ? (
          <span className="muted ms-1 font-normal" title="Lower is better">
            <span aria-hidden="true">↓</span>
            <span className="sr-only"> (lower is better)</span>
          </span>
        ) : null}
      </span>
      <Rank place={a} neutral={neutral} className="col-start-1 row-start-1 sm:col-start-2" />
      <Value stat={stat} place={a} better={better === "a"} className="col-start-1 row-start-2 text-right sm:col-start-3 sm:row-start-1" />
      <div className="col-start-2 row-start-2 sm:col-start-4 sm:row-start-1">
        <HalfBar share={leagueShare(rows, stat, a?.value)} side="a" better={better === "a"} />
      </div>
      <div className="col-start-3 row-start-2 sm:col-start-5 sm:row-start-1">
        <HalfBar share={leagueShare(rows, stat, b?.value)} side="b" better={better === "b"} />
      </div>
      <Value stat={stat} place={b} better={better === "b"} className="col-start-4 row-start-2 text-left sm:col-start-6 sm:row-start-1" />
      <Rank place={b} neutral={neutral} className="col-start-4 row-start-1 text-right sm:col-start-7" />
    </m.li>
  );
}

// A family's rows under its title and the two clubs' names over their halves: the TV code below sm, the name from sm.
function StatGroup({ group, rows, entityA, entityB }) {
  return (
    <section aria-label={group.family}>
      <div aria-hidden="true" className={`${ROW_GRID} muted gap-y-0.5 border-b border-base-300 pb-1 text-xs font-bold tracking-wide uppercase`}>
        <h3 className="text-base-content col-span-4 text-sm tracking-normal normal-case sm:col-span-1">{group.family}</h3>
        <span className="col-span-2 col-start-1 text-center sm:col-start-3">
          <ShortLabel short={entityA.tvCode ?? entityA.label} full={entityA.label} />
        </span>
        <span className="col-span-2 col-start-3 text-center sm:col-start-5">
          <ShortLabel short={entityB.tvCode ?? entityB.label} full={entityB.label} />
        </span>
      </div>
      <m.ul variants={listContainer} initial="hidden" animate="show">
        {group.rows.map((row) => (
          <StatRow key={row.stat.key} row={row} rows={rows} />
        ))}
      </m.ul>
    </section>
  );
}

// Every team statistic of the phase, the two clubs side by side on one line each: their places among the league's clubs, their
// numbers and a butterfly of bars, the better side in the primary colour. The families sit in two columns from xl.
export default function CompareTeamStats({ seasonCode, phaseCode, entityA: pickedA, entityB: pickedB }) {
  const [entityA, entityB] = useClubEntities(seasonCode, pickedA, pickedB);
  const source = useTeamRows(seasonCode, phaseCode);
  if (source.isLoading) return <AsyncState status="loading" label="Loading the comparison" skeleton={<TeamStatsSkeleton />} />;
  if (source.isError) return <AsyncState status="error" message="Could not load the comparison." onRetry={source.refetch} />;

  const rowA = source.rows.find((row) => row.clubCode === entityA.id);
  const rowB = source.rows.find((row) => row.clubCode === entityB.id);
  if (!rowA || !rowB) return <EmptyText>These clubs have no statistics in this phase yet.</EmptyText>;

  const groups = STAT_FAMILY_ORDER.map((family) => ({
    family,
    rows: statsOfFamily(family, usable, source)
      .map((stat) => {
        const a = placeOn(source.rows, stat, entityA.id);
        const b = placeOn(source.rows, stat, entityB.id);
        return { stat, a, b, better: betterSide(stat, a?.value ?? null, b?.value ?? null) };
      })
      .filter((row) => row.a || row.b),
  })).filter((group) => group.rows.length > 0);
  const all = groups.flatMap((group) => group.rows);
  const count = (side) => all.filter((row) => row.better === side).length;
  const level = count("level");

  return (
    <Panel as="section" aria-label="Statistics compared" className="p-4">
      <PanelHeader compact level="h2" kicker="STATISTICS" title="Per game, side by side" />
      <p className="mb-1 text-sm" data-testid="stats-summary">
        <b>{entityA.label}</b> better on <b className="tabular-nums">{count("a")}</b> · <b>{entityB.label}</b> better on{" "}
        <b className="tabular-nums">{count("b")}</b>
        {level ? ` · ${level} level` : ""}
      </p>
      <p className="muted text-xs">
        Per game, overtime counted. Beside each number: the club&apos;s place among the {source.rows.length} clubs (green top third, red bottom
        third); a full bar is the league&apos;s best. ↓ marks a number where lower is better.
      </p>
      <ForfeitStatsNote seasonCode={seasonCode} phaseCode={phaseCode} clubCodes={[entityA.id, entityB.id]} className="muted text-xs" />
      {source.unadjusted ? <p className="muted text-xs">{UNADJUSTED_NOTE}</p> : null}
      {/* Two columns from xl (efficiency to shooting on the left); one column in the same order below. */}
      <div className="mt-4 grid gap-x-10 gap-y-6 xl:grid-cols-2">
        {[true, false].map((left) => (
          <div key={String(left)} className="flex min-w-0 flex-col gap-6">
            {groups
              .filter((group) => LEFT_FAMILIES.has(group.family) === left)
              .map((group) => (
                <StatGroup key={`${phaseCode}-${group.family}`} group={group} rows={source.rows} entityA={entityA} entityB={entityB} />
              ))}
          </div>
        ))}
      </div>
    </Panel>
  );
}
