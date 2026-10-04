import { motion } from "motion/react";
import { efficiencyRamp } from "./chartHelpers";
import EmptyText from "./EmptyText";
import { formatPercentage } from "./format";
import HeaderTip from "./HeaderTip";
import { EASE_OUT, listContainer, listItem } from "./motion";
import Panel from "./Panel";
import HeatmapLegend from "./HeatmapLegend";
import PanelHeader from "./PanelHeader";
import ShootingCourt from "./ShootingCourt";
import ShootingLegend from "./ShootingLegend";
import { zoneExtremes } from "./shotBreakdown";

// The cards, the court and the tables of the team and player Shooting tabs, shared by both.
const COURT_MAX_WIDTH = "46rem";

export function MetricCard({ label, value, detail }) {
  return (
    <Panel className="p-3 text-center">
      <p className="eyebrow mb-1">{label}</p>
      {/* Keyed by the value, so a changed number eases in instead of swapping. */}
      <motion.p
        key={value}
        className="text-xl font-semibold"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
      >
        {value}
      </motion.p>
      {detail ? <p className="muted text-xs">{detail}</p> : null}
    </Panel>
  );
}

// Shared by the zone table and the situation table, so their columns line up: name, a bar for the share, that share and
// two figures that differ by table. On a phone the name sits on its own line above the numbers.
const TABLE_GRID = "grid items-center gap-x-3 grid-cols-[1fr_3rem_4rem_3.5rem] sm:grid-cols-[11.5rem_1fr_3rem_4.5rem_3.5rem]";
const NAME_CELL = "col-span-4 flex min-w-0 items-center gap-2 sm:col-span-1";

// `dotValue` (optional) colours a dot before the name by that percentage, on the court's colour scale. `columns` are the
// two figures after the share: a header and how to print a row.
function BreakdownTable({ firstColumn, shareHeader = "Share", columns, rows, dotValue }) {
  const biggest = Math.max(...rows.map((row) => row.share), 0) || 1;

  return (
    <div>
      <div aria-hidden="true" className={`${TABLE_GRID} muted border-b border-base-300 pb-1 text-xs font-bold tracking-wide uppercase`}>
        <span className="col-span-4 sm:col-span-1">{firstColumn}</span>
        <span className="hidden sm:block" />
        <span className="hidden text-right sm:block">{shareHeader}</span>
        {columns.map((column) => (
          <span key={column.header} className="hidden text-right sm:block">
            {column.header}
          </span>
        ))}
      </div>
      <motion.ul variants={listContainer} initial="hidden" animate="show">
        {rows.map((row) => (
          <motion.li
            key={row.key}
            variants={listItem}
            layout="position"
            className={`${TABLE_GRID} gap-y-1 border-b border-base-300 py-2 text-sm last:border-0`}
          >
            <span className={NAME_CELL}>
              {dotValue ? (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 flex-none rounded-full ring-1 ring-base-content/20 transition-colors duration-300"
                  style={{ backgroundColor: efficiencyRamp(dotValue(row)) }}
                />
              ) : null}
              <span className="truncate">{row.tip ? <HeaderTip tip={row.tip}>{row.label}</HeaderTip> : row.label}</span>
            </span>
            <div aria-hidden="true" className="h-2 min-w-0 overflow-hidden rounded-full bg-base-300">
              {/* Grows from nothing on arrival and slides to the new width when a filter changes. */}
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(row.share / biggest) * 100}%` }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              />
            </div>
            <span className="text-right tabular-nums">{Math.round(row.share * 100)}%</span>
            {columns.map((column) => (
              <span key={column.header} className={`text-right tabular-nums ${column.strong ? "font-semibold" : "muted"}`}>
                {column.render(row)}
              </span>
            ))}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

const ZONE_COLUMNS = [
  { header: "Made", render: (row) => `${row.made}-${row.attempts}` },
  { header: "FG%", render: (row) => formatPercentage(row.fg), strong: true },
];
const SITUATION_COLUMNS = [
  { header: "Made", render: (row) => row.made },
  { header: "Points", render: (row) => row.points, strong: true },
];

// `favorable` says whether a hot zone is good news (a club's or player's own shooting) or bad news (an opponent's).
export function ZonesPanel({ rows, title, favorable = true }) {
  const extremes = zoneExtremes(rows);
  const hotTone = favorable ? "stat-badge-positive" : "stat-badge-negative";
  const coldTone = favorable ? "stat-badge-negative" : "stat-badge-positive";

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker="ZONES"
        title={title}
        trailing={
          extremes ? (
            <div className="flex flex-wrap justify-end gap-2">
              <span className={`stat-badge ${hotTone}`}>
                Hottest: {extremes.hottest.label} · {formatPercentage(extremes.hottest.fg)}
              </span>
              <span className={`stat-badge ${coldTone}`}>
                Coldest: {extremes.coldest.label} · {formatPercentage(extremes.coldest.fg)}
              </span>
            </div>
          ) : null
        }
      />
      {rows.length === 0 ? (
        <EmptyText>No located attempts.</EmptyText>
      ) : (
        <BreakdownTable firstColumn="Zone" shareHeader="Share" columns={ZONE_COLUMNS} rows={rows} dotValue={(row) => row.fg} />
      )}
      <p className="muted mt-3 text-sm">
        Most used first. The dot is the zone's FG% on the same colour scale as the court; the bar is its share of the shots.
        Hottest and coldest only count zones with a fair number of attempts.
      </p>
    </Panel>
  );
}

export function SituationsPanel({ rows, title }) {
  const hasPoints = rows.some((row) => row.points > 0);

  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="STYLE" title={title} />
      {hasPoints ? (
        <BreakdownTable firstColumn="Situation" shareHeader="Of pts" columns={SITUATION_COLUMNS} rows={rows} />
      ) : (
        <EmptyText>No made shots in this selection.</EmptyText>
      )}
      <p className="muted mt-3 text-sm">
        Share of the points from field goals. The feed only marks shots that scored, so there is no shooting percentage
        here. A basket can be in more than one group (a fast break off a turnover counts in both), and every basket that is
        none of them is half court.
      </p>
    </Panel>
  );
}

// The four cards, then the court beside the zone and scoring-style tables. `shots` are the filtered attempts, `courtShots`
// the same attempts drawn in one colour, `resetKey` remounts the tables when whose shots are shown changes. Switching
// between heatmap and markers fades the new view in; filters inside a view animate in the court itself.
export default function ShootingBreakdown({
  shots,
  courtShots,
  presentation,
  replayKey,
  courtLabel,
  cards,
  zoneRows,
  situationRows,
  zonesTitle,
  situationsTitle,
  favorable = true,
  resetKey = "",
}) {
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {shots.length === 0 ? (
        <EmptyText>No attempts match these filters.</EmptyText>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,46rem)_minmax(0,1fr)]">
          <div className="flex flex-col justify-center gap-3 rounded-field border border-base-300 bg-base-100/60 p-3">
            <motion.div
              key={presentation}
              className="flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <ShootingCourt
                shots={courtShots}
                teams={[{ clubCode: "SIDE" }]}
                mode={presentation}
                resultColors
                replayKey={replayKey}
                maxWidth={COURT_MAX_WIDTH}
                ariaLabel={courtLabel}
              />
              {presentation === "heatmap" ? <HeatmapLegend /> : <ShootingLegend teams={[]} resultColors />}
            </motion.div>
          </div>
          <div className="flex flex-col gap-4">
            <ZonesPanel key={`zones-${resetKey}`} rows={zoneRows} title={zonesTitle} favorable={favorable} />
            <SituationsPanel key={`situations-${resetKey}`} rows={situationRows} title={situationsTitle} />
          </div>
        </div>
      )}
    </>
  );
}
