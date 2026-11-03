import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Avatar, RankBadge } from "../leaders/LeaderParts";
import { PLAYER_STATS } from "../leaders/leaderDefs";
import HeaderTip from "../lib/HeaderTip";
import { denseListContainer, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import ShortLabel from "../lib/ShortLabel";
import { seasonSlug } from "../lib/seasonSlug";
import { useMediaQuery } from "../lib/useMediaQuery";
import { timelineSeasons, whenText } from "./recordData";

const PIR_TIP = PLAYER_STATS.find((stat) => stat.key === "pir")?.tip;

// The second line of a holder: a club or an opponent, as its TV code below sm and in full from sm.
const labelOf = (full, short) => (short && short !== full ? <ShortLabel short={short} full={full} /> : full);

// A club as its TV code at every width; the full name is on hover and for screen readers. A traded player's codes come joined with ";".
export function CodeLabel({ short, full }) {
  return (
    <span className="relative" title={full}>
      <span aria-hidden="true">{short.replaceAll(";", "/")}</span>
      <span className="sr-only">{full}</span>
    </span>
  );
}

// Whoever holds a record: their picture (a player's headshot, a club's crest), the name linked when the row says where they are, and a second line
// under it (a player's club with its crest, the opponent of a team game). A part the row does not carry is left out. `size` is the picture's.
// `short` is for the narrow lists: a club's name is its TV code below sm. The record book's rows and the podium pass `compact` (a smaller second
// line, with the club or opponent as its TV code at every width) and `extra`, more of the second line after it. The Top 50 passes `inline`: the
// club or opponent as its TV code beside the name, on one line where it fits.
export function Holder({ record, size = "h-9 w-9", short = false, compact = false, inline = false, extra = null }) {
  const text = short && record.shortName ? <ShortLabel short={record.shortName} full={record.name} /> : record.name;
  const code = record.shortLine ? <CodeLabel short={record.shortLine} full={record.line} /> : record.line;
  const line = compact ? code : labelOf(record.line, record.shortLine);
  const secondLine = Boolean(record.line) && !inline;
  const name = record.to ? (
    <Link to={record.to} className="font-semibold hover:underline">
      {text}
    </Link>
  ) : (
    <span className="font-semibold">{text}</span>
  );
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {/* A player always has a picture: the headshot, or the silhouette when there is none. */}
      {!record.isClub ? <Avatar optimize imageUrl={record.portraitUrl} size={`${size} flex-none`} /> : null}
      {record.crestUrl ? <Avatar optimize crest imageUrl={record.crestUrl} size={`${size} flex-none`} /> : null}
      <div className="min-w-0">
        <p className="wrap-break-word">
          {name}
          {inline && record.line ? (
            <span className="muted ms-1.5 inline-flex items-center gap-1 align-middle text-xs">
              {record.lineCrestUrl ? <Avatar optimize crest imageUrl={record.lineCrestUrl} size="h-3.5 w-3.5" /> : null}
              {code}
            </span>
          ) : null}
        </p>
        {secondLine || extra ? (
          <p className={`muted flex items-center ${compact ? "text-xs" : "text-sm"} ${extra ? "flex-wrap gap-x-1.5" : "gap-1.5"}`}>
            {secondLine && record.lineCrestUrl ? <Avatar optimize crest imageUrl={record.lineCrestUrl} size="h-4 w-4" /> : null}
            {secondLine ? <span className="wrap-break-word">{line}</span> : null}
            {extra}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// "New in 2026-27" on a record set in the season being viewed (`seasonCode` is the address's season).
export function NewBadge({ record, seasonCode }) {
  return seasonSlug(record.seasonCode) === seasonCode ? <span className="badge badge-primary badge-xs whitespace-nowrap">New in {record.season}</span> : null;
}

// When a record was set, with a small link to the game for a single-game record. `dateOnly` (the podium and the one-line Top 50 rows, where there
// is little room) writes a game's day without its season, which stays on hover.
function WhenLink({ record, dateOnly = false }) {
  return (
    <>
      {dateOnly && record.date ? <span title={record.season}>{record.date}</span> : whenText(record)}
      {record.gameTo ? (
        <>
          {" · "}
          <Link to={record.gameTo} className="font-semibold text-primary hover:underline">
            Game
          </Link>
        </>
      ) : null}
    </>
  );
}

function PodiumRow({ record, rank, seasonCode }) {
  return (
    <motion.li variants={listItem} className="flex items-center gap-3 py-2.5">
      <RankBadge rank={rank} />
      <div className="min-w-0 flex-1">
        <Holder record={record} size="h-10 w-10" compact />
        {/* Under the name and club, in line with them past the picture: when it was set (the game's link) and the season badge. */}
        <p className="muted mt-0.5 ms-12.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="wrap-break-word">
            <WhenLink record={record} dateOnly />
          </span>
          <NewBadge record={record} seasonCode={seasonCode} />
        </p>
      </div>
      <span className={`flex-none text-xl font-black tabular-nums ${rank === 1 ? "text-primary" : ""}`}>{record.valueText}</span>
    </motion.li>
  );
}

// What the record is set against: how far it leads the row behind it (the holder's own other season when it is theirs), the record it took
// over, how long it has stood in timeline seasons, and how often the record has been set.
function recordFacts(records, slots, progression) {
  const [first, second] = records;
  const record = progression.at(-1) ?? first;
  const facts = [];
  if (second) {
    const lead = first.value - second.value;
    const behind = second.holderKey !== null && second.holderKey === first.holderKey ? `own ${second.season}` : `${second.name}, ${second.season}`;
    facts.push(["Lead over 2nd", lead === 0 ? `Tied with ${behind}` : `${first.change(lead)} over ${behind}`]);
  }
  const before = progression.at(-2);
  if (before) facts.push(["Previous record", `${before.valueText}, ${before.name}, ${before.season}`]);
  const standing = slots.length - slots.findIndex((slot) => slot.seasonCode === record.seasonCode);
  if (slots.length > 0) facts.push(["Standing", `${standing} season${standing === 1 ? "" : "s"}, since ${record.season}`]);
  if (progression.length > 0) facts.push(["Times set", `${progression.length} since ${progression[0].season}`]);
  return facts;
}

// The three best as compact rows, then the record's facts at the foot of the panel. From xl the panel sits beside the timeline and is as tall
// as it; below xl it is above it.
export function Podium({ records, bySeason, progression, seasonCode }) {
  const slots = useMemo(() => timelineSeasons(bySeason, progression), [bySeason, progression]);
  const facts = recordFacts(records, slots, progression);
  return (
    <Panel as="section" aria-labelledby="records-podium" className="flex h-full flex-col p-4 sm:p-5">
      <h2 id="records-podium" className="panel-title">
        Podium
      </h2>
      <motion.ol className="mt-1 divide-y divide-base-300" variants={listContainer} initial="hidden" animate="show">
        {records.slice(0, 3).map((record, index) => (
          <PodiumRow key={record.key} record={record} rank={index + 1} seasonCode={seasonCode} />
        ))}
      </motion.ol>
      {facts.length > 0 ? (
        <div className="mt-auto border-t border-base-300 pt-3">
          <p className="eyebrow mb-2">Record facts</p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            {facts.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="muted">{term}</dt>
                <dd className="wrap-break-word font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </Panel>
  );
}

// The best of each season that has one (timeline slots), with the seasons that set the record and the record that stands marked. Below sm a row
// is two lines: the season and the value, then the holder.
export function SeasonList({ seasons, overallKey }) {
  return (
    <ul className="divide-y divide-base-300">
      {seasons.map(({ record, setRecord, gain }) => (
        <li key={`best-${record.seasonCode}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:flex">
          <span className="muted w-16 flex-none text-sm font-semibold tabular-nums max-sm:order-1">{record.season}</span>
          <div className="min-w-0 flex-1 max-sm:order-3 max-sm:col-span-2">
            <Holder record={record} short />
          </div>
          <div className="flex flex-none flex-wrap items-center justify-end gap-x-2 gap-y-1 max-sm:order-2 sm:flex-col sm:items-end sm:gap-1">
            <span className="text-lg font-bold tabular-nums">{record.valueText}</span>
            {setRecord ? (
              <span className={`text-xs font-semibold ${gain === null ? "muted" : "text-success"}`}>{gain === null ? "First record" : `New record ${record.change(gain)}`}</span>
            ) : null}
            {record.key === overallKey ? <span className="badge badge-primary badge-sm">Record</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

// The rows shown before "Show all".
const FIRST_ROWS = 25;

// The value of a row with a bar sized against the best: value / best, or best / value when lower is better, so the best is always full.
function Share({ value, best, lowerIsBetter }) {
  const share = lowerIsBetter ? (value > 0 ? best / value : 0) : best > 0 ? value / best : 0;
  return (
    <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-base-300">
      <span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.min(Math.max(share, 0), 1) * 100}%` }} />
    </span>
  );
}

// From sm a row of the Top 50 is one line: the rank, the holder (with the club's code), when it was set (the game's link) and the season badge,
// and the value with its bar (the bar from lg). Below sm it is two lines: the rank, the holder and the value, then when it was set and the bar.
function BoardRow({ record, rank, best, lowerIsBetter, seasonCode, wide }) {
  const share = <Share value={record.value} best={best} lowerIsBetter={lowerIsBetter} />;
  if (wide) {
    return (
      <motion.li
        variants={listItem}
        className="grid break-inside-avoid grid-cols-[1.75rem_minmax(0,1fr)_auto_3.5rem] items-center gap-x-3 border-b border-base-300 py-1.5 lg:grid-cols-[1.75rem_minmax(0,1fr)_auto_4rem_3.5rem]"
      >
        <RankBadge rank={rank} />
        <Holder record={record} size="h-8 w-8" inline />
        <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm">
          <span className="whitespace-nowrap">
            <WhenLink record={record} dateOnly />
          </span>
          <NewBadge record={record} seasonCode={seasonCode} />
        </span>
        <span className="hidden lg:block">{share}</span>
        <span className="text-right font-semibold tabular-nums">{record.valueText}</span>
      </motion.li>
    );
  }
  return (
    <motion.li variants={listItem} className="border-b border-base-300 py-1.5 last:border-0">
      <div className="flex items-center gap-2.5">
        <RankBadge rank={rank} />
        <div className="min-w-0 flex-1">
          <Holder record={record} size="h-7 w-7" inline short />
        </div>
        <span className="font-black tabular-nums">{record.valueText}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-3 ps-9.5 text-xs">
        <span className="muted min-w-0 flex-1 wrap-break-word">
          <WhenLink record={record} />
        </span>
        <NewBadge record={record} seasonCode={seasonCode} />
        <span className="w-16 flex-none">{share}</span>
      </div>
    </motion.li>
  );
}

// Each holder's best row (the rows come best first). A row without a holder's key always stays.
function bestPerHolder(records) {
  const seen = new Set();
  return records.filter((record) => {
    if (record.holderKey === null) return true;
    if (seen.has(record.holderKey)) return false;
    seen.add(record.holderKey);
    return true;
  });
}

// The three holders with the most rows, each with how many, leaving out anyone who appears once. The sort is stable, so holders with the same
// count keep the order they first appear in.
function mostEntries(records) {
  const counts = new Map();
  for (const record of records) {
    if (record.holderKey === null) continue;
    const entry = counts.get(record.holderKey) ?? { record, count: 0 };
    entry.count += 1;
    counts.set(record.holderKey, entry);
  }
  return [...counts.values()].filter((entry) => entry.count > 1).sort((a, b) => b.count - a.count).slice(0, 3);
}

function MostEntries({ entries }) {
  return (
    <span className="block sm:inline">
      Most entries:{" "}
      {entries.map(({ record, count }, index) => (
        <span key={record.holderKey}>
          {index > 0 ? " · " : null}
          {record.to ? (
            <Link to={record.to} className="font-semibold text-base-content hover:underline">
              {record.name}
            </Link>
          ) : (
            <span className="font-semibold text-base-content">{record.name}</span>
          )}{" "}
          {count}
        </span>
      ))}
    </span>
  );
}

// The Top 50: rank, holder, season (linked to the game for a game record), and the value with a bar sized against the best. From xl the rows
// run down two columns, so a wide screen holds them without empty space. It opens on the first 25. `unique` (One per player or club, kept by
// the page across choices) leaves each holder's best row.
export function Board({ family, metricKey, label, records, lowerIsBetter = false, seasonCode, unique, onUniqueChange }) {
  const [showAll, setShowAll] = useState(false);
  const wide = useMediaQuery("(min-width: 40rem)");
  const best = (lowerIsBetter ? Math.min : Math.max)(...records.map((record) => record.value));
  const isClub = family === "team" || family === "teamgame";
  const list = unique ? bestPerHolder(records) : records;
  const shown = showAll ? list : list.slice(0, FIRST_ROWS);
  const repeats = unique ? [] : mostEntries(records);
  return (
    <Panel as="section" className="p-4 sm:p-5">
      <PanelHeader
        kicker="RANKING"
        title={unique ? `Top 50 · ${list.length} ${isClub ? "clubs" : "players"}` : "Top 50"}
        trailing={
          <label className="flex cursor-pointer items-center gap-2 text-sm max-sm:min-h-11">
            <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={unique} onChange={(event) => onUniqueChange(event.target.checked)} />
            One per {isClub ? "club" : "player"}
          </label>
        }
      />
      <p className="muted mt-2 text-sm">
        Ranked by {metricKey === "pir" && PIR_TIP ? <HeaderTip tip={PIR_TIP}>{label}</HeaderTip> : label}
        {repeats.length > 0 ? (
          <>
            <span aria-hidden="true" className="max-sm:hidden">
              {" · "}
            </span>
            <MostEntries entries={repeats} />
          </>
        ) : null}
      </p>
      <motion.ol id="records-top" className="mt-1 xl:columns-2 xl:gap-x-10" variants={denseListContainer} initial="hidden" animate="show">
        {shown.map((record, index) => (
          <BoardRow key={record.key} record={record} rank={index + 1} best={best} lowerIsBetter={lowerIsBetter} seasonCode={seasonCode} wide={wide} />
        ))}
      </motion.ol>
      {!showAll && list.length > FIRST_ROWS ? (
        <button type="button" className="btn btn-ghost btn-sm mt-2 w-full" onClick={() => setShowAll(true)}>
          Show all {list.length}
        </button>
      ) : null}
    </Panel>
  );
}
