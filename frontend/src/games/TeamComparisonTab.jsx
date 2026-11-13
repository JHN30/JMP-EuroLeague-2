import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import { formatFractionPercent } from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import Panel from "../lib/Panel";
import { displayName } from "../lib/playerName";
import { TeamComparisonSkeleton } from "./GamePageSkeleton";
import { teamCode } from "./gameUtils";
import TeamLabel from "./TeamLabel";
import { buildTeamComparison, SOURCE_LABELS } from "./teamComparison";

const LOADING_MARK = (
  <span className="muted">
    <span aria-hidden="true">…</span>
    <span className="sr-only">Loading</span>
  </span>
);

const MIX_PARTS = [
  { key: "twos", label: "2s", swatch: "bg-primary" },
  { key: "threes", label: "3s", swatch: "bg-accent" },
  { key: "freeThrows", label: "FT", swatch: "bg-secondary" },
];

// Traditional box-score numbers first, so a reader who does not know the advanced ones meets the familiar ones first.
const COLUMNS = [
  { number: 1, title: "Traditional stats" },
  { number: 2, title: "Advanced stats" },
];

const stateOf = (query) => (query.isError ? "error" : query.isSuccess ? "success" : "loading");

function TeamHeader({ localTeam, roadTeam }) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-4 max-sm:gap-2">
      <div className="flex justify-end">
        <TeamLabel team={localTeam} />
      </div>
      <TeamLabel team={roadTeam} />
    </div>
  );
}

function Coach({ total, className = "" }) {
  return total?.coachName ? <p className={`muted mt-0.5 text-xs ${className}`}>Coach: {displayName(total.coachName)}</p> : null;
}

function SummaryStrip({ items }) {
  if (items.length === 0) return null;
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="The game in numbers">
      {items.map((item) => (
        <div key={item.key} className="rounded-field bg-base-200 px-2 py-1.5 text-center">
          <dt className="muted text-xs font-bold tracking-wide uppercase">{item.tip ? <HeaderTip tip={item.tip}>{item.label}</HeaderTip> : item.label}</dt>
          <dd className="font-semibold tabular-nums">{item.loading ? LOADING_MARK : item.display}</dd>
        </div>
      ))}
    </dl>
  );
}

// One team's points split into twos, threes and free throws. Each part is printed as text, so the colour never carries
// the numbers alone.
function MixBar({ team, mix }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-12 flex-none text-xs font-bold">{teamCode(team)}</span>
        <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-base-300" aria-hidden="true">
          {MIX_PARTS.map((part) => (mix[part.key] > 0 ? <span key={part.key} className={part.swatch} style={{ width: `${(100 * mix[part.key]) / mix.total}%` }} /> : null))}
        </div>
        <span className="w-8 flex-none text-right font-semibold tabular-nums">{mix.total}</span>
      </div>
      <p className="muted mt-1 flex flex-wrap gap-x-3 pl-14 text-xs tabular-nums">
        {MIX_PARTS.map((part) => (
          <span key={part.key} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${part.swatch}`} />
            {part.label} {mix[part.key]} ({formatFractionPercent(mix.total > 0 ? mix[part.key] / mix.total : null, 0)})
          </span>
        ))}
      </p>
    </div>
  );
}

function PointsMix({ mix, localTeam, roadTeam }) {
  if (!mix.local || !mix.road) return null;
  return (
    <div className="mb-2 border-b border-base-300 pb-2" data-testid="points-mix">
      <MixBar team={localTeam} mix={mix.local} />
      <MixBar team={roadTeam} mix={mix.road} />
    </div>
  );
}

function ExtraChances({ extra, localTeam, roadTeam }) {
  const label = (
    <HeaderTip tip="Offensive rebounds plus turnovers forced, minus turnovers plus offensive rebounds allowed: the extra shots a team earned">
      extra chances
    </HeaderTip>
  );
  return (
    <p className="mt-2 text-center text-sm" data-testid="extra-chances">
      {extra.side === null ? (
        <>Even on {label}</>
      ) : (
        <>
          <span className="font-bold">{teamCode(extra.side === "local" ? localTeam : roadTeam)}</span>{" "}
          <span className="font-semibold tabular-nums">+{extra.margin}</span> {label}
        </>
      )}
    </p>
  );
}

function GroupPanel({ group, localTeam, roadTeam }) {
  const headingId = `comparison-${group.key}`;
  return (
    // From lg both columns end on one line: a panel grows by its row count, so a shorter column's spare height is shared
    // evenly by its rows (each row grows) instead of pooling at the bottom of one panel.
    <Panel as="section" aria-labelledby={headingId} className="flex flex-col p-4 max-sm:p-3" style={{ flexGrow: group.rows.length }}>
      <h3 id={headingId} className="muted mb-2 text-center text-xs font-bold tracking-wide uppercase">
        {group.title}
      </h3>
      <TeamHeader localTeam={localTeam} roadTeam={roadTeam} />
      {group.mix ? <PointsMix mix={group.mix} localTeam={localTeam} roadTeam={roadTeam} /> : null}
      {group.rows.map(({ key, loading, ...row }) => (
        <ComparisonRow key={key} {...row} inline {...(loading ? { missingText: LOADING_MARK } : {})} />
      ))}
      {group.extraChances ? <ExtraChances extra={group.extraChances} localTeam={localTeam} roadTeam={roadTeam} /> : null}
    </Panel>
  );
}

function FailedSources({ failed, queries }) {
  if (failed.length === 0) return null;
  const names = failed.map((source) => SOURCE_LABELS[source]);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return (
    <p className="muted flex flex-wrap items-center gap-2 text-sm">
      The {list} couldn't be loaded.
      <button type="button" className="btn btn-sm" onClick={() => failed.forEach((source) => queries[source].refetch())}>
        Retry
      </button>
    </p>
  );
}

function SeasonNote({ note }) {
  if (!note) return null;
  return (
    <p className="muted text-sm">
      {note.hidden
        ? `Season averages need at least ${note.minGames} games, so they are hidden for a team that has played fewer.`
        : `The tick on each bar marks the team's season average through round ${note.round}. "Opp allows" is what the opponent gives up on average.`}
    </p>
  );
}

// The two teams side by side: one header with the coaches and the values both teams share, then the traditional groups and the
// advanced groups in two columns from lg. The box score is the base; the advanced stats, play-by-play figures and shots load on their own, so
// trouble with one only touches its own rows.
export default function TeamComparisonTab({ game, boxScoreQuery, advancedQuery, teamFlowQuery, shotsQuery }) {
  if (boxScoreQuery.isLoading) return <AsyncState status="loading" label="Loading team comparison" skeleton={<TeamComparisonSkeleton />} />;
  if (boxScoreQuery.isError) {
    return <AsyncState status="error" message="Could not load team comparison." onRetry={() => boxScoreQuery.refetch()} />;
  }
  const { localTeam, roadTeam } = game;
  const model = buildTeamComparison(
    {
      boxScore: boxScoreQuery.data,
      advanced: advancedQuery.data,
      teamFlow: teamFlowQuery.data,
      shots: shotsQuery.data?.shots,
      teams: { local: localTeam, road: roadTeam },
    },
    { advanced: stateOf(advancedQuery), flow: stateOf(teamFlowQuery), shots: stateOf(shotsQuery) },
  );
  if (!model) return <EmptyText>Team totals weren't recorded for this game.</EmptyText>;
  const totalFor = (side) => boxScoreQuery.data.teamStats.find((row) => row.side === side && row.statsKind === "total");
  const column = (number) => model.groups.filter((group) => group.column === number);

  return (
    <div className="flex flex-col gap-4">
      <Panel className="p-4 max-sm:p-3">
        <div className="grid grid-cols-2 gap-4 max-sm:gap-2">
          <div className="flex flex-col items-end text-right">
            <TeamLabel team={localTeam} />
            <Coach total={totalFor("local")} />
          </div>
          <div>
            <TeamLabel team={roadTeam} />
            <Coach total={totalFor("road")} />
          </div>
        </div>
        <SummaryStrip items={model.strip} />
      </Panel>
      <FailedSources failed={model.failed} queries={{ advanced: advancedQuery, flow: teamFlowQuery, shots: shotsQuery }} />
      <div className="grid gap-4 lg:grid-cols-2">
        {COLUMNS.map(({ number, title }) => (
          <div key={number} className="flex flex-col gap-4">
            <h2 className="eyebrow -mb-2">{title}</h2>
            {column(number).map((group) => (
              <GroupPanel key={group.key} group={group} localTeam={localTeam} roadTeam={roadTeam} />
            ))}
          </div>
        ))}
      </div>
      <SeasonNote note={model.seasonNote} />
    </div>
  );
}
