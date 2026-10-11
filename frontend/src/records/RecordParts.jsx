import { motion } from "motion/react";
import { Link } from "react-router";
import { Avatar, RankBadge } from "../leaders/LeaderParts";
import { PLAYER_STATS } from "../leaders/leaderDefs";
import HeaderTip from "../lib/HeaderTip";
import { formatCount } from "../lib/format";
import { denseListContainer, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";

const PIR_TIP = PLAYER_STATS.find((stat) => stat.key === "pir")?.tip;

// The name of whoever holds a record, linked when the row says where they are, with their club under it (a player) or their crest beside it
// (a club). A part the row does not carry is left out.
export function Holder({ record }) {
  const name = record.to ? (
    <Link to={record.to} className="font-semibold hover:underline">
      {record.name}
    </Link>
  ) : (
    <span className="font-semibold">{record.name}</span>
  );
  const clubText = record.club?.name ?? record.club?.code ?? null;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {record.crestUrl ? <Avatar crest imageUrl={record.crestUrl} size="h-9 w-9" /> : null}
      <div className="min-w-0">
        <p className="wrap-break-word">{name}</p>
        {clubText ? <p className="muted text-sm wrap-break-word">{clubText}</p> : null}
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
          <span className={`text-4xl font-black tabular-nums ${rank === 1 ? "text-primary" : ""}`}>{formatCount(record.value)}</span>
          <span className="muted text-sm font-semibold">{label}</span>
        </p>
        <Holder record={record} />
        {record.gameTo ? (
          <Link to={record.gameTo} className="btn btn-outline btn-xs mt-auto w-fit">
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
                <span className="text-xl font-bold tabular-nums">{formatCount(record.value)}</span>
                {gain !== null ? <span className="text-sm font-semibold text-success">+{formatCount(gain)}</span> : null}
                {current ? <span className="badge badge-primary badge-sm">Current record</span> : null}
              </p>
              <p className="text-sm">
                {record.to ? (
                  <Link to={record.to} className="font-semibold hover:underline">
                    {record.name}
                  </Link>
                ) : (
                  <span className="font-semibold">{record.name}</span>
                )}
                <span className="muted"> {"·"} {whenText(record)}</span>
              </p>
            </motion.li>
          );
        })}
      </motion.ol>
    </Panel>
  );
}

// The best of each season that has any, with the record that stands marked.
export function BestOfEachSeason({ records, overall }) {
  return (
    <Panel as="section" className="p-5">
      <PanelHeader kicker="BY SEASON" title="Best in each season" />
      <motion.ul className="mt-2 divide-y divide-base-300" variants={listContainer} initial="hidden" animate="show">
        {records.map((record) => (
          <motion.li key={`best-${record.seasonCode}`} variants={listItem} className="flex items-center gap-4 py-3">
            <span className="muted w-16 flex-none text-sm font-semibold tabular-nums">{record.season}</span>
            <div className="min-w-0 flex-1">
              <Holder record={record} />
            </div>
            <div className="flex flex-none flex-col items-end gap-1">
              <span className="text-lg font-bold tabular-nums">{formatCount(record.value)}</span>
              {record === overall ? <span className="badge badge-primary badge-sm">Record</span> : null}
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </Panel>
  );
}

// The Top 50: rank, holder, season (and the game), and the value with a bar sized against the best.
export function Board({ family, metricKey, label, records }) {
  const best = Math.max(...records.map((record) => record.value));
  const hasGames = family === "game";
  return (
    <Panel as="section" className="p-5">
      <PanelHeader kicker="RANKING" title="Top 50" />
      <div className="mt-3 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-14">Rank</th>
              <th>{family === "team" ? "Club" : "Player"}</th>
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
                <td className="whitespace-nowrap">{record.date ? `${record.season} · ${record.date}` : record.season}</td>
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
                    <span aria-hidden="true" className="h-1.5 w-24 flex-none overflow-hidden rounded-full bg-base-300">
                      <span className="block h-full rounded-full bg-primary/70" style={{ width: `${best > 0 ? (record.value / best) * 100 : 0}%` }} />
                    </span>
                    <span className="w-16 text-right font-semibold tabular-nums">{formatCount(record.value)}</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </Panel>
  );
}
