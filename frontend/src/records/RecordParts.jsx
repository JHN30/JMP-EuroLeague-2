import { motion } from "motion/react";
import { Link } from "react-router";
import { Avatar, RankBadge } from "../leaders/LeaderParts";
import { PLAYER_STATS } from "../leaders/leaderDefs";
import HeaderTip from "../lib/HeaderTip";
import { denseListContainer, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import ShortLabel from "../lib/ShortLabel";
import { useMediaQuery } from "../lib/useMediaQuery";

const PIR_TIP = PLAYER_STATS.find((stat) => stat.key === "pir")?.tip;

// The second line of a holder: a club or an opponent, as its TV code below sm and in full from sm.
const labelOf = (full, short) => (short && short !== full ? <ShortLabel short={short} full={full} /> : full);

// Whoever holds a record: their picture (a player's headshot, a club's crest), the name linked when the row says where they are, and a second line
// under it (a player's club with its crest, the opponent of a team game). A part the row does not carry is left out. `size` is the picture's.
// `short` is for the narrow lists: a club's name is its TV code below sm.
export function Holder({ record, size = "h-9 w-9", short = false }) {
  const text = short && record.shortName ? <ShortLabel short={record.shortName} full={record.name} /> : record.name;
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
      {!record.isClub ? <Avatar imageUrl={record.portraitUrl} size={`${size} flex-none`} /> : null}
      {record.crestUrl ? <Avatar crest imageUrl={record.crestUrl} size={`${size} flex-none`} /> : null}
      <div className="min-w-0">
        <p className="wrap-break-word">{name}</p>
        {record.line ? (
          <p className="muted flex items-center gap-1.5 text-sm">
            {record.lineCrestUrl ? <Avatar crest imageUrl={record.lineCrestUrl} size="h-4 w-4" /> : null}
            <span className="wrap-break-word">{labelOf(record.line, record.shortLine)}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

// When the record was set: the season, with the day for a game.
const whenText = (record) => (record.date ? `${record.season} · ${record.date}` : record.season);

function PodiumCard({ record, rank, label }) {
  return (
    <motion.li variants={listItem} className="min-w-0">
      <Panel className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <RankBadge rank={rank} />
          <span className="muted text-sm">{whenText(record)}</span>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={`text-4xl font-black tabular-nums ${rank === 1 ? "text-primary" : ""}`}>{record.valueText}</span>
          <span className="muted text-sm font-semibold">{label}</span>
        </p>
        <Holder record={record} size="h-14 w-14" />
        {record.gameTo ? (
          <Link to={record.gameTo} className="btn btn-outline btn-xs mt-auto w-fit max-sm:min-h-11">
            Game
          </Link>
        ) : null}
      </Panel>
    </motion.li>
  );
}

// The three best, side by side from lg.
export function Podium({ records, label }) {
  return (
    <section aria-labelledby="records-podium">
      <h2 id="records-podium" className="panel-title mb-3">
        Podium
      </h2>
      <motion.ol className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3" variants={listContainer} initial="hidden" animate="show">
        {records.slice(0, 3).map((record, index) => (
          <PodiumCard key={record.key} record={record} rank={index + 1} label={label} />
        ))}
      </motion.ol>
    </section>
  );
}

// Every record that beat the one before it, oldest first, the last of them the record that stands.
export function Progression({ steps }) {
  return (
    <Panel as="section" className="p-5">
      <PanelHeader kicker="PROGRESSION" title="Record progression" />
      <motion.ol className="relative mt-4 ml-1.5 border-l border-base-300" variants={listContainer} initial="hidden" animate="show">
        {steps.map(({ record, gain }, index) => {
          const current = index === steps.length - 1;
          return (
            <motion.li key={record.key} variants={listItem} className="relative pb-5 pl-6 last:pb-0">
              <span aria-hidden="true" className={`absolute top-1.5 -left-1.5 size-3 rounded-full border-2 border-base-100 ${current ? "bg-primary" : "bg-base-content/40"}`} />
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-bold tabular-nums">{record.valueText}</span>
                {gain !== null ? <span className="text-sm font-semibold text-success">+{record.format(gain)}</span> : null}
                {current ? <span className="badge badge-primary badge-sm">Current record</span> : null}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                <Holder record={record} size="h-7 w-7" />
                <span className="muted max-sm:basis-full">{whenText(record)}</span>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </Panel>
  );
}

// The best of each season that has any, with the record that stands marked. Below sm a row is two lines: the season and the value, then the holder.
export function BestOfEachSeason({ records, overallKey }) {
  return (
    <Panel as="section" className="p-5">
      <PanelHeader kicker="BY SEASON" title="Best in each season" />
      <motion.ul className="mt-2 divide-y divide-base-300" variants={listContainer} initial="hidden" animate="show">
        {records.map((record) => (
          <motion.li key={`best-${record.seasonCode}`} variants={listItem} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:flex">
            <span className="muted w-16 flex-none text-sm font-semibold tabular-nums max-sm:order-1">{record.season}</span>
            <div className="min-w-0 flex-1 max-sm:order-3 max-sm:col-span-2">
              <Holder record={record} short />
            </div>
            <div className="flex flex-none items-center gap-2 max-sm:order-2 max-sm:justify-end sm:flex-col sm:items-end sm:gap-1">
              {record.key === overallKey ? <span className="badge badge-primary badge-sm sm:order-2">Record</span> : null}
              <span className="text-lg font-bold tabular-nums sm:order-1">{record.valueText}</span>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </Panel>
  );
}

// The value of a row with a bar sized against the best.
function Share({ value, best }) {
  return (
    <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-base-300">
      <span className="block h-full rounded-full bg-primary/70" style={{ width: `${best > 0 ? (value / best) * 100 : 0}%` }} />
    </span>
  );
}

// Below sm the Top 50 is a list: the rank, the holder and the value, then the season (and the game) and the bar.
function BoardList({ metricKey, label, records, best }) {
  return (
    <>
      <p className="muted mt-3 text-sm">Ranked by {metricKey === "pir" && PIR_TIP ? <HeaderTip tip={PIR_TIP}>{label}</HeaderTip> : label}</p>
      <motion.ol className="mt-1" variants={denseListContainer} initial="hidden" animate="show">
        {records.map((record, index) => (
          <motion.li key={record.key} variants={listItem} className="border-b border-base-300 py-3 last:border-0">
            <div className="flex items-start gap-3">
              <RankBadge rank={index + 1} />
              <div className="min-w-0 flex-1">
                <Holder record={record} short />
              </div>
              <span className="text-lg font-black tabular-nums">{record.valueText}</span>
            </div>
            <div className="mt-1.5 ml-10 flex items-center justify-between gap-3 text-sm">
              <span className="muted">{whenText(record)}</span>
              {record.gameTo ? (
                <Link to={record.gameTo} className="btn btn-ghost btn-xs min-h-11">
                  Game
                </Link>
              ) : null}
            </div>
            <div className="mt-1.5 ml-10">
              <Share value={record.value} best={best} />
            </div>
          </motion.li>
        ))}
      </motion.ol>
    </>
  );
}

// The Top 50: rank, holder, season (and the game), and the value with a bar sized against the best (the bar from lg).
export function Board({ family, metricKey, label, records }) {
  const isTable = useMediaQuery("(min-width: 40rem)");
  const best = Math.max(...records.map((record) => record.value));
  const isClub = family === "team" || family === "teamgame";
  const hasGames = family === "game" || family === "teamgame";
  return (
    <Panel as="section" className="p-5">
      <PanelHeader kicker="RANKING" title="Top 50" />
      {isTable ? (
        <div className="mt-3 overflow-x-auto">
          <table className="table max-lg:table-sm">
            <thead>
              <tr>
                <th className="w-14">Rank</th>
                <th>{isClub ? "Club" : "Player"}</th>
                <th>Season</th>
                {hasGames ? <th>Game</th> : null}
                <th className="text-right">{metricKey === "pir" && PIR_TIP ? <HeaderTip tip={PIR_TIP}>{label}</HeaderTip> : label}</th>
              </tr>
            </thead>
            <motion.tbody variants={denseListContainer} initial="hidden" animate="show">
              {records.map((record, index) => (
                <motion.tr key={record.key} variants={listItem} className="hover:bg-base-200/60">
                  <td>
                    <RankBadge rank={index + 1} />
                  </td>
                  <td>
                    <Holder record={record} />
                  </td>
                  <td className="whitespace-nowrap">{whenText(record)}</td>
                  {hasGames ? (
                    <td>
                      {record.gameTo ? (
                        <Link to={record.gameTo} className="btn btn-ghost btn-xs">
                          Game
                        </Link>
                      ) : null}
                    </td>
                  ) : null}
                  <td>
                    <div className="flex items-center justify-end gap-3">
                      <span className="hidden w-24 flex-none lg:block">
                        <Share value={record.value} best={best} />
                      </span>
                      <span className="w-16 text-right font-semibold tabular-nums">{record.valueText}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      ) : (
        <BoardList metricKey={metricKey} label={label} records={records} best={best} />
      )}
    </Panel>
  );
}
