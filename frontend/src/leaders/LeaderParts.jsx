import { useContext, useState } from "react";
import { createPortal } from "react-dom";
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
import { useMediaQuery } from "../lib/useMediaQuery";
import ViewSelect from "../lib/ViewSelect";
import { ToolbarSlot } from "./toolbarSlot";

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
// `compact` (a category card's row, where it sits beside the person's name) shows the TV code again from lg; the full name stays
// for screen readers and on hover.
export function TeamTag({ code, name, tvCode, crestUrl, compact = false }) {
  if (!code && !name) return null;
  const full = name ?? code;
  const short = (tvCode ?? code ?? name).replaceAll(";", "/");
  const label = !name ? (
    full
  ) : compact ? (
    <span className="relative" title={full}>
      <span aria-hidden="true" className="sm:max-lg:hidden">
        {short}
      </span>
      <span className="max-sm:sr-only lg:sr-only">{full}</span>
    </span>
  ) : (
    <ShortLabel short={short} full={full} />
  );
  return (
    <span className="muted flex min-w-0 items-center gap-1.5 text-xs">
      {crestUrl ? <RevealImage src={sizedImageUrl(crestUrl, CREST_WIDTH)} loading="lazy" decoding="async" className="h-4 w-4 flex-none object-contain" /> : null}
      <span className="min-w-0 line-clamp-2 wrap-break-word">{label}</span>
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

// `compact` (Leaders) is a size smaller from lg.
export function RankBadge({ rank, compact = false }) {
  return (
    <span
      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold tabular-nums ${compact ? "lg:h-6 lg:w-6" : ""} ${
        rank === 1 ? "bg-warning/25 text-warning" : "bg-base-300"
      }`}
    >
      {rank}
    </span>
  );
}

// ---- A landing card: the top five for one category ----

// A row's share of the category's best value, as a bar that grows in.
function ShareBar({ share, className }) {
  return (
    <div aria-hidden="true" className={`overflow-hidden rounded-full bg-base-300 ${className}`}>
      <motion.div
        className="h-full rounded-full bg-primary/70"
        initial={{ width: 0 }}
        animate={{ width: `${share}%` }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}
      />
    </div>
  );
}

// `entries`: { key, rank, name, shortName, imageUrl, crest, team: { code, name, crestUrl }, valueText, share, to } in rank order; `to` opens the
// person's or club's page, and `shortName` (a club's abbreviated name) replaces the name from lg.
// `emptyText` replaces "No one yet." when the card is empty for a known reason. The family is the section's heading, so the card
// does not repeat it. From lg the card is compact: the way to the full board sits beside the title, and each row is one line
// (name and team side by side, the bar under them).
export function CategoryCard({ title, tip, entries, isLoading, isError, onRetry, onOpen, footnote, emptyText = "No one yet." }) {
  const wide = useMediaQuery("(min-width: 64rem)");
  return (
    <Panel className="flex flex-col p-4 lg:p-3">
      <div className="mb-3 flex items-center justify-between gap-2 lg:mb-1">
        <h3 className="min-w-0 truncate text-lg font-bold lg:text-base" title={tip}>
          {title}
        </h3>
        <button type="button" aria-label="See the full leaderboard" className="btn btn-ghost btn-xs hidden flex-none lg:inline-flex" onClick={onOpen}>
          Full leaderboard <span aria-hidden="true">→</span>
        </button>
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
            const top = entry.rank === 1;
            return (
              <motion.li key={entry.key} variants={listItem} className="border-b border-base-300 py-2 last:border-0 lg:py-1">
                <Row {...rowProps}>
                  <div className="flex items-center gap-2 sm:gap-3 lg:gap-2">
                    <RankBadge rank={entry.rank} compact />
                    {/* The top row stands out with larger sizes from sm; on a phone they would leave too little room for a long name. */}
                    <Avatar optimize imageUrl={entry.imageUrl} crest={entry.crest} size={top ? "h-10 w-10 sm:h-12 sm:w-12 lg:h-9 lg:w-9" : "h-10 w-10 lg:h-8 lg:w-8"} />
                    <div className="min-w-0 flex-1">
                      <div className="lg:flex lg:items-baseline lg:gap-2">
                        <p className={`font-semibold max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate lg:min-w-0 ${top ? "text-sm sm:text-base lg:text-sm" : "text-sm"}`}
                          title={wide && entry.shortName ? entry.name : undefined}
                        >
                          {wide && entry.shortName ? entry.shortName : entry.name}
                        </p>
                        <TeamTag {...entry.team} compact />
                      </div>
                      <ShareBar share={entry.share} className="mt-1 hidden h-0.5 lg:block" />
                    </div>
                    <span className={`font-black tabular-nums ${top ? "text-xl text-primary sm:text-2xl lg:text-xl" : "text-lg lg:text-base"}`}>{entry.valueText}</span>
                  </div>
                  <ShareBar share={entry.share} className="mt-1.5 ml-10 h-1 lg:hidden" />
                </Row>
              </motion.li>
            );
          })}
        </motion.ol>
      )}
      {footnote ? <p className="muted mt-2 text-xs lg:mt-1">{footnote}</p> : null}
      <button type="button" className="btn btn-ghost btn-sm mt-3 justify-between lg:hidden" onClick={onOpen}>
        <span>See the full leaderboard</span>
        <span aria-hidden="true">→</span>
      </button>
    </Panel>
  );
}

export function CardGrid({ children }) {
  return <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</div>;
}

// ---- Controls shared by the full boards ----

// The choices beside the scope tabs (in the page's ToolbarSlot), as one row at every width (it wraps on a phone): the stage, a
// board's statistic, and per game or totals. Each control has its label above it, so the row lines up on the controls.
export function LeadersToolbar({ children }) {
  const slot = useContext(ToolbarSlot);
  if (slot === undefined) return <div className="flex flex-wrap items-end gap-3">{children}</div>;
  return slot ? createPortal(children, slot) : null;
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

// The line above a board: what the board shows. The way back to the cards is the page's back link (LeadersPage). From lg it sits
// in the controls' row, as tall as a select so it lines up with them.
export function BoardTopLine({ children }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 lg:min-h-8">{children}</div>;
}

// A board's line, its order and filters (which take the rest of the row), and its notes: stacked below lg, one row from lg (the
// notes on a line of their own under it).
export function BoardControls({ children }) {
  return <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-6 lg:gap-y-3">{children}</div>;
}

// The size of a board's photo or crest: a step smaller from lg.
export const BOARD_AVATAR = "h-8 w-8 sm:h-10 sm:w-10 lg:h-8 lg:w-8";

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
        <RankBadge rank={rank} compact />
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
        <span className="ml-auto w-16 flex-none text-right text-lg font-black tabular-nums lg:text-base">{valueText}</span>
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
