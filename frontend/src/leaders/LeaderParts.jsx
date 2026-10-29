import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import AsyncState from "../lib/AsyncState";
import { CategoryRowsSkeleton } from "./LeadersSkeleton";
import EmptyText from "../lib/EmptyText";
import { CREST_WIDTH, PORTRAIT_WIDTH, sizedImageUrl } from "../lib/imageSize";
import { EASE_OUT, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import { Silhouette } from "../lib/PlayerPortrait";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import ToggleButtons from "../lib/ToggleButtons";
import ViewSelect from "../lib/ViewSelect";

// ---- Small pieces shared by the three leaderboards ----

// A player's face (the feed's portraits are full length, so the photo is zoomed onto the head) or a club's crest.
// A player without a photo, or whose photo does not load, shows the silhouette instead; never both.
// `optimize` asks the CDN for a small copy and loads it only near the screen (Records and Leaders; Compare keeps the original).
export function Avatar({ imageUrl, crest = false, size = "h-8 w-8 sm:h-10 sm:w-10", optimize = false }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const src = optimize ? sizedImageUrl(imageUrl, crest ? CREST_WIDTH : PORTRAIT_WIDTH) : imageUrl;
  const loading = optimize ? { loading: "lazy", decoding: "async" } : {};
  if (crest) {
    return (
      <span className={`${size} flex flex-none items-center justify-center`}>
        {src ? <RevealImage src={src} className="max-h-full max-w-full object-contain" {...loading} /> : null}
      </span>
    );
  }
  return (
    <span className={`${size} relative flex-none overflow-hidden rounded-full bg-neutral`}>
      {src && failedUrl !== src ? (
        <RevealImage
          src={src}
          effect="wipe"
          className="h-full w-full origin-top scale-[1.7] object-cover object-top"
          onError={() => setFailedUrl(src)}
          {...loading}
        />
      ) : (
        <Silhouette />
      )}
    </span>
  );
}

// The club's TV code below sm and its full name from sm; a traded player's codes come joined with ";".
export function TeamTag({ code, name, tvCode, crestUrl }) {
  if (!code && !name) return null;
  const full = name ?? code;
  const short = (tvCode ?? code ?? name).replaceAll(";", "/");
  return (
    <span className="muted flex min-w-0 items-center gap-1.5 text-xs">
      {crestUrl ? <RevealImage src={sizedImageUrl(crestUrl, CREST_WIDTH)} loading="lazy" decoding="async" className="h-4 w-4 flex-none object-contain" /> : null}
      <span className="min-w-0 line-clamp-2 wrap-break-word">{name ? <ShortLabel short={short} full={full} /> : full}</span>
    </span>
  );
}

// Places gained (positive) or lost since the latest round, or nothing when there is no earlier rank.
export function Movement({ change }) {
  if (change === null || change === undefined) return null;
  if (change === 0) return <span className="muted w-8 text-center text-xs" title="Same place as before the latest round">–</span>;
  const up = change > 0;
  return (
    <span
      className={`w-8 text-center text-xs font-bold tabular-nums ${up ? "text-success" : "text-error"}`}
      title={`${up ? "Up" : "Down"} ${Math.abs(change)} place${Math.abs(change) === 1 ? "" : "s"} since before the latest round`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(change)}
    </span>
  );
}

export function RankBadge({ rank }) {
  return (
    <span
      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold tabular-nums ${
        rank === 1 ? "bg-warning/25 text-warning" : "bg-base-300"
      }`}
    >
      {rank}
    </span>
  );
}

// ---- A landing card: the top five for one category ----

// `entries`: { key, rank, name, imageUrl, crest, team: { code, name, crestUrl }, valueText, share, to } in rank order; `to` opens the person's or club's page.
// `emptyText` replaces "No one yet." when the card is empty for a known reason.
export function CategoryCard({ kicker, title, tip, entries, isLoading, isError, onRetry, onOpen, footnote, emptyText = "No one yet." }) {
  return (
    <Panel className="flex flex-col p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {kicker ? <p className="eyebrow mb-0.5">{kicker}</p> : null}
          <h3 className="truncate text-lg font-bold" title={tip}>
            {title}
          </h3>
        </div>
      </div>
      {isLoading ? (
        <AsyncState status="loading" label={`Loading ${title}`} skeleton={<CategoryRowsSkeleton />} />
      ) : isError ? (
        <AsyncState status="error" message="Could not load this category." onRetry={onRetry} inline />
      ) : entries.length === 0 ? (
        <EmptyText>{emptyText}</EmptyText>
      ) : (
        <motion.ol className="flex flex-1 flex-col" variants={listContainer} initial="hidden" animate="show">
          {entries.map((entry) => {
            // A row with a `to` is one link; the team tag inside stays text, since links do not nest.
            const Row = entry.to ? Link : "div";
            const rowProps = entry.to ? { to: entry.to, className: "board-row-link block" } : {};
            return (
              <motion.li key={entry.key} variants={listItem} className="border-b border-base-300 py-2 last:border-0">
                <Row {...rowProps}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <RankBadge rank={entry.rank} />
                    {/* The top row stands out with larger sizes from sm; on a phone they would leave too little room for a long name. */}
                    <Avatar optimize imageUrl={entry.imageUrl} crest={entry.crest} size={entry.rank === 1 ? "h-10 w-10 sm:h-12 sm:w-12" : "h-10 w-10"} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate ${entry.rank === 1 ? "text-sm sm:text-base" : "text-sm"}`}>{entry.name}</p>
                      <TeamTag {...entry.team} />
                    </div>
                    <span className={`font-black tabular-nums ${entry.rank === 1 ? "text-xl text-primary sm:text-2xl" : "text-lg"}`}>{entry.valueText}</span>
                  </div>
                  <div aria-hidden="true" className="mt-1.5 ml-10 h-1 overflow-hidden rounded-full bg-base-300">
                    <motion.div
                      className="h-full rounded-full bg-primary/70"
                      initial={{ width: 0 }}
                      animate={{ width: `${entry.share}%` }}
                      transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}
                    />
                  </div>
                </Row>
              </motion.li>
            );
          })}
        </motion.ol>
      )}
      {footnote ? <p className="muted mt-2 text-xs">{footnote}</p> : null}
      <button type="button" className="btn btn-ghost btn-sm mt-3 justify-between" onClick={onOpen}>
        <span>See the full leaderboard</span>
        <span aria-hidden="true">→</span>
      </button>
    </Panel>
  );
}

export function CardGrid({ children }) {
  return <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

// ---- Controls shared by the full boards ----

// The choices under the scope tabs, as one row at every width (it wraps on a phone): the stage, a board's statistic, and per game or
// totals. Each control has its label above it, so the row lines up on the controls.
export function LeadersToolbar({ children }) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}

// The stage the numbers cover; nothing to choose, and nothing shown, when the season has one.
export function StageSelect({ stages, value, onChange }) {
  if (stages.length < 2) return null;
  return <ViewSelect className="w-full sm:w-56" label="Stage" value={value} options={stages} onChange={onChange} />;
}

// Per game or season totals, as two buttons.
const MODES = [
  { key: "perGame", label: "Per game" },
  { key: "accumulated", label: "Totals" },
];

export function ModeToggle({ ariaLabel, mode, onChange }) {
  return <ToggleButtons label="Show" ariaLabel={ariaLabel} choices={MODES} value={mode} onChange={onChange} panelId="leaders-panel" />;
}

// The line above a board: what the board shows. The way back to the cards is the page's back link (LeadersPage).
export function BoardTopLine({ children }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{children}</div>;
}

// A board's statistic: one select at every width, its statistics in a section per family.
export function StatSelect({ families, stats, activeKey, onChoose }) {
  const groups = families.map((family) => ({
    label: family,
    options: stats.filter((entry) => entry.family === family).map((entry) => ({ key: entry.key, label: entry.label })),
  }));
  return <ViewSelect className="w-full sm:w-72" label="Statistic" value={activeKey} groups={groups} onChange={onChoose} />;
}

// ---- A full-board row ----

// The column header over the rows; `columns` are the same extra figures the rows carry.
export function BoardHeader({ columns = [], valueLabel }) {
  return (
    <div aria-hidden="true" className="board-row muted border-b border-base-300 text-xs font-bold tracking-wide uppercase" style={{ "--extra": columns.length }}>
      <span>#</span>
      <span>Name</span>
      {columns.map((column) => (
        <span key={column} className="hidden text-right sm:block">
          {column}
        </span>
      ))}
      <span className="text-right">{valueLabel}</span>
    </div>
  );
}

// `columns` are the extra figures between the person and the value (games, minutes...); `to` opens the person's page.
export function BoardRow({ rank, change, avatar, name, sub, columns = [], valueText, share, to }) {
  const content = (
    <>
      <span className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1">
        <RankBadge rank={rank} />
        <Movement change={change} />
      </span>
      <span className="flex min-w-0 items-center gap-2 sm:gap-3">
        {avatar}
        <span className="min-w-0">
          <span className="block font-semibold leading-tight max-sm:text-xs max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate">{name}</span>
          <span className="block min-w-0">{sub}</span>
        </span>
      </span>
      {columns.map((column) => (
        <span key={column.label} className="muted hidden text-right text-sm tabular-nums sm:block" title={column.label}>
          {column.value}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="hidden h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-base-300 sm:block">
          <motion.span
            className="block h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${share}%` }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          />
        </span>
        <span className="ml-auto w-16 flex-none text-right text-lg font-black tabular-nums">{valueText}</span>
      </span>
    </>
  );
  const style = { "--extra": columns.length };
  return (
    <motion.li variants={listItem} className="border-b border-base-300 last:border-0">
      {to ? (
        <Link to={to} className="board-row board-row-link" style={style}>
          {content}
        </Link>
      ) : (
        <div className="board-row" style={style}>
          {content}
        </div>
      )}
    </motion.li>
  );
}
