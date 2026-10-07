import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getAdvancedStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatFractionPercent, formatRound, formatSignedDecimal } from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import AdvancedExplainedView from "./AdvancedExplainedView";
import { HomeAwayLink, NetBar, RatingsScatter } from "./advancedVisuals";
import { AnimatedBody, AnimatedRow } from "./motionTable";
import ScrollingTable from "./ScrollingTable";
import { ClubCell } from "./standingsCells";

const SCOPE_LABELS = { RS: "Regular season", all: "All games", PS: "Postseason" };

// Each view is a few groups of columns. A column is a label, a short tip, and how to show its value for one club.
const count = (key) => (entry) => entry[key] ?? "—";
const decimal = (key, digits = 1) => (entry) => formatDecimal(entry[key], digits);
const signed = (key) => (entry) => formatSignedDecimal(entry[key]);
const percent = (key) => (entry) => formatFractionPercent(entry[key]);
const record = (games, wins) => (entry) => (entry[games] > 0 ? `${entry[wins]}-${entry[games] - entry[wins]}` : "—");

const isNumber = (value) => value !== null && value !== undefined && Number.isFinite(Number(value));

// A cell shaded by the club's rank in its column: green for the best, red for the worst, nothing for the middle.
function shadeStyle(rank, total) {
  if (rank === undefined || total < 2) return undefined;
  const score = 1 - (rank - 1) / (total - 1);
  const amount = Math.abs(score - 0.5) * 2;
  const colour = score >= 0.5 ? "var(--color-success)" : "var(--color-error)";
  return { background: `color-mix(in srgb, ${colour} ${Math.round(amount * 52)}%, var(--color-base-100))` };
}

// Recent form is tinted only when it is 3 or more points from the season figure, so the tint means something.
const FORM_GAP = 3;
function formTint(entry, key) {
  if (!isNumber(entry[key]) || !isNumber(entry.netRating)) return undefined;
  const gap = entry[key] - entry.netRating;
  if (Math.abs(gap) < FORM_GAP) return undefined;
  const colour = gap > 0 ? "var(--color-success)" : "var(--color-error)";
  return { background: `color-mix(in srgb, ${colour} 30%, var(--color-base-100))` };
}

// A four-factors column: shaded by rank, already flipped where lower is better.
const factor = (label, tip, key, higherBetter) => ({ label, tip, value: percent(key), shade: { key, higherBetter } });

function srsValue(entry) {
  return (
    <>
      {formatSignedDecimal(entry.srs)}
      {entry.connected ? null : (
        <span className="ml-1">
          <HeaderTip tip="Schedule not connected to the rest of the league, so SRS is not calculated">
            <span className="badge badge-xs badge-warning">*</span>
          </HeaderTip>
        </span>
      )}
    </>
  );
}

const GAMES = { label: "GP", tip: "Games played", value: count("gamesPlayed") };
const WINS = { label: "W", tip: "Wins", value: count("wins") };
const LOSSES = { label: "L", tip: "Losses", value: count("losses") };
const NET = { label: "Net", tip: "Net rating: points scored minus allowed per 100 possessions", value: signed("netRating"), strong: true };
const NET_BAR = { ...NET, render: (entry, context) => <NetBar value={entry.netRating} max={context.maxNet} /> };
const EXPECTED_WINS = { label: "Exp W", tip: "Expected wins: wins implied by points scored and allowed (Pythagorean)", value: decimal("pythagoreanWins") };
const OFFENSE = { label: "ORtg", tip: "Offensive rating: points scored per 100 possessions", value: decimal("offensiveRating") };
const DEFENSE = { label: "DRtg", tip: "Defensive rating: points allowed per 100 possessions (lower is better)", value: decimal("defensiveRating") };
const SRS = { label: "SRS", tip: "Simple rating system: average margin adjusted for schedule strength", value: srsValue };

const VIEWS = [
  {
    key: "overview",
    label: "Overview",
    groups: [
      { columns: [GAMES, WINS, LOSSES, EXPECTED_WINS] },
      {
        columns: [
          OFFENSE,
          DEFENSE,
          NET_BAR,
          { label: "Pace", tip: "Pace: possessions per 40 minutes", value: decimal("pace") },
          { label: "eFG%", tip: "Effective field goal percentage: shooting that counts threes as worth more", value: percent("efgPct") },
          SRS,
        ],
      },
      {
        columns: [
          { label: "L10", tip: "Last 10: record in the last 10 games", value: record("last10Games", "last10Wins") },
          { label: "L10 Net", tip: "Net rating over the last 10 games", value: signed("last10NetRating") },
        ],
      },
    ],
  },
  {
    key: "ratings",
    label: "Ratings",
    groups: [
      {
        label: "Results",
        columns: [
          WINS,
          EXPECTED_WINS,
          { label: "MOV", tip: "Margin of victory: average points margin per game", value: signed("mov") },
        ],
      },
      {
        label: "Per 100 possessions",
        columns: [
          OFFENSE,
          DEFENSE,
          NET,
        ],
      },
      {
        label: "Versus league average",
        columns: [
          { label: "Off", tip: "Offensive rating minus the league average", value: signed("relativeOffensiveRating") },
          { label: "Def", tip: "Defensive rating minus the league average (negative is better)", value: signed("relativeDefensiveRating") },
          { label: "Pace", tip: "Pace minus the league average", value: signed("relativePace") },
        ],
      },
    ],
  },
  {
    key: "factors",
    label: "Four factors",
    legend: (
      <>
        <span className="rank-ramp" aria-hidden="true" /> Worst to best in the league. Each cell is shaded by the club&apos;s rank on that
        column, already flipped where lower is better (turnovers, shooting allowed). Hover a cell for the exact rank.
      </>
    ),
    groups: [
      {
        label: "Offense",
        columns: [
          factor("eFG%", "Effective field goal percentage: shooting that counts threes as worth more", "efgPct", true),
          factor("TOV%", "Turnover rate: share of plays ending in a turnover (lower is better)", "tovPct", false),
          factor("ORB%", "Offensive rebound rate: share of available offensive rebounds won", "orbPct", true),
          factor("FT rate", "Free throw rate: free throws made per field goal attempt", "ftRate", true),
        ],
      },
      {
        label: "Defense",
        columns: [
          factor("eFG% allowed", "Opponents' effective field goal percentage (lower is better)", "oppEfgPct", false),
          factor("TOV% forced", "Share of opponent plays ending in a turnover (higher is better)", "oppTovPct", true),
          factor("DRB%", "Defensive rebound rate: share of available defensive rebounds won", "drbPct", true),
          factor("FT rate allowed", "Opponents' free throws made per field goal attempt (lower is better)", "oppFtRate", false),
        ],
      },
      {
        label: "Also",
        columns: [
          { label: "TS%", tip: "True shooting percentage: scoring efficiency counting threes and free throws", value: percent("trueShootingPct") },
          { label: "AST ratio", tip: "Assist ratio: assists per field goal made", value: percent("assistRatio") },
        ],
      },
    ],
  },
  {
    key: "schedule",
    label: "Schedule",
    groups: [
      {
        label: "Strength",
        columns: [
          SRS,
          { label: "SOS", tip: "Strength of schedule: average opponent SRS (above 0 is harder than average)", value: signed("sos") },
          { label: "SOV", tip: "Strength of victories: average opponent SRS in wins", value: signed("sov") },
        ],
      },
      {
        label: "Adjusted for opponents",
        columns: [
          { label: "Adj ORtg", tip: "Offensive rating adjusted for the strength of opponents", value: decimal("adjOffensiveRating") },
          { label: "Adj DRtg", tip: "Defensive rating adjusted for the strength of opponents (lower is better)", value: decimal("adjDefensiveRating") },
          { label: "Adj Net", tip: "Net rating adjusted for the strength of opponents", value: signed("adjNetRating"), strong: true },
        ],
      },
    ],
  },
  {
    key: "splits",
    label: "Splits",
    legend: (
      <>
        Away net rating (hollow dot) to home net rating (filled dot), on one scale for every club: the length of the link is the home
        advantage. Last 10 is tinted green or red when it is 3 or more points from the season figure. Last 5 is only five games, so it
        stays plain.
      </>
    ),
    groups: [
      {
        label: "Home and away",
        columns: [
          { label: "Home W-L", tip: "Record at home", value: record("homeGames", "homeWins") },
          { label: "Away W-L", tip: "Record on the road", value: record("awayGames", "awayWins") },
          { label: "Home Net", tip: "Net rating at home", value: signed("homeNetRating") },
          { label: "Away Net", tip: "Net rating on the road", value: signed("awayNetRating") },
          {
            label: "Home adv",
            tip: "Home advantage: home net rating minus away net rating",
            value: (entry) =>
              isNumber(entry.homeNetRating) && isNumber(entry.awayNetRating) ? formatSignedDecimal(entry.homeNetRating - entry.awayNetRating) : "—",
            strong: true,
          },
          {
            label: "Away → Home net",
            // The dot chart is for wider screens; below sm the same figures are the numbers beside it.
            wideOnly: true,
            tip: "Net rating away (hollow dot) to net rating at home (filled dot)",
            render: (entry, context) => (
              <HomeAwayLink
                away={entry.awayNetRating}
                home={entry.homeNetRating}
                low={context.netLow}
                high={context.netHigh}
                clubName={entry.clubName ?? entry.clubCode}
              />
            ),
          },
        ],
      },
      {
        label: "Recent form",
        columns: [
          { label: "L5 W-L", tip: "Record in the last 5 games", value: record("last5Games", "last5Wins") },
          { label: "L5 Net", tip: "Net rating in the last 5 games (a small sample)", value: signed("last5NetRating") },
          { label: "L10 W-L", tip: "Record in the last 10 games", value: record("last10Games", "last10Wins") },
          {
            label: "L10 Net",
            tip: "Net rating in the last 10 games, tinted when 3 or more points from the season figure",
            value: signed("last10NetRating"),
            style: (entry) => formTint(entry, "last10NetRating"),
          },
        ],
      },
    ],
  },
  { key: "explained", label: "Explained", groups: [] },
];

const VIEW_TABS = VIEWS.map(({ key, label }) => ({ key, label }));

export default function AdvancedStandingsView({ seasonCode, shortNames }) {
  const [scope, setScope] = useState(null);
  const [round, setRound] = useState(null);
  const [viewKey, setViewKey] = useState("overview");

  const query = useQuery({
    queryKey: ["advanced-standings", seasonCode, scope, round],
    queryFn: () => getAdvancedStandings(seasonCode, { scope: scope ?? undefined, round: round ?? undefined }),
    placeholderData: keepPreviousData,
  });

  if (query.isLoading) return <AsyncState status="loading" label="Loading advanced standings" />;
  if (query.isError) {
    return <AsyncState status="error" message="Could not load advanced standings." onRetry={() => query.refetch()} />;
  }

  const { scopes, rounds, standings } = query.data;
  const activeScope = query.data.scope;
  if (standings.length === 0) return <EmptyText>Advanced standings not available yet for this season.</EmptyText>;

  const view = VIEWS.find((candidate) => candidate.key === viewKey) ?? VIEWS[0];

  // Figures shared by every row of the table: the Net bar scale, the home and away scale, and each club's rank in the
  // columns that are shaded by rank.
  const context = { maxNet: Math.max(1, ...standings.map((entry) => (isNumber(entry.netRating) ? Math.abs(entry.netRating) : 0))) };
  const homeAway = standings.flatMap((entry) => [entry.homeNetRating, entry.awayNetRating]).filter(isNumber);
  context.netLow = Math.floor(Math.min(0, ...homeAway)) - 1;
  context.netHigh = Math.ceil(Math.max(0, ...homeAway)) + 1;
  const ranks = {};
  for (const column of view.groups.flatMap((group) => group.columns)) {
    if (!column.shade) continue;
    const { key, higherBetter } = column.shade;
    const ordered = standings
      .filter((entry) => isNumber(entry[key]))
      .sort((a, b) => (higherBetter ? b[key] - a[key] : a[key] - b[key]));
    ranks[key] = new Map(ordered.map((entry, index) => [entry.clubCode, { rank: index + 1, total: ordered.length }]));
  }
  const labelled = view.groups.some((group) => group.label);
  const explained = view.key === "explained";
  // SRS, SOS, SOV and the adjusted ratings need every club linked to every other through played games.
  const scheduleMissing = view.key === "schedule" && standings.every((entry) => !entry.connected);

  function changeScope(next) {
    setScope(next);
    setRound(null);
  }

  return (
    <div className="breakdown-vis flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <TabStrip
          ariaLabel="Advanced standings scope"
          panelId="advanced-standings-panel"
          activeKey={activeScope}
          onChange={changeScope}
          className="w-fit"
          tabs={scopes.map((code) => ({ key: code, label: SCOPE_LABELS[code] ?? code }))}
        />
        <label className="flex items-center gap-2 text-xs text-base-content/70">
          Round
          <select
            className="select select-sm select-bordered"
            value={query.data.round}
            onChange={(event) => setRound(Number(event.target.value))}
          >
            {rounds.map((roundNumber) => (
              <option key={roundNumber} value={roundNumber}>
                {formatRound(roundNumber)}
                {roundNumber === rounds[rounds.length - 1] ? " (latest)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <TabStrip
        ariaLabel="Advanced standings view"
        panelId="advanced-standings-panel"
        activeKey={view.key}
        onChange={setViewKey}
        className="w-fit"
        tabs={VIEW_TABS}
      />

      <TabPanel id="advanced-standings-panel" focusKey={`${activeScope}-${view.key}`} scroll={false}>
        <motion.div key={view.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          {explained ? (
            <AdvancedExplainedView standings={standings} scopeLabel={SCOPE_LABELS[activeScope] ?? activeScope} round={query.data.round} />
          ) : (
          <>
          {view.key === "ratings" ? (
            <Panel className="mb-3 p-3">
              <PanelHeader kicker="ATTACK AGAINST DEFENCE" title="Who is strong on which end?" />
              <RatingsScatter entries={standings} />
              <p className="muted px-1 pt-2 text-xs">
                The defence axis is flipped so the good corner is top right. Dashed lines are the league averages. The faint diagonals are
                lines of equal net rating: clubs on the same diagonal have the same net rating. Hover a crest for the numbers.
              </p>
            </Panel>
          ) : null}
          <Panel className="p-2">
            {scheduleMissing ? (
              <p className="px-1 pb-2 text-sm text-base-content/80">
                Schedule ratings are not available yet. They need every club to be linked to every other through a chain of
                opponents, not to have played each other, which usually happens within the first few rounds.
              </p>
            ) : null}
            <ScrollingTable>
              <table className={`table breakdown-table pinned-table${view.key === "splits" ? " pin-wide" : ""}`}>
                <thead>
                  {labelled ? (
                    <tr>
                      <th />
                      <th />
                      {view.groups.flatMap((group) => {
                        const phoneColumns = group.columns.filter((column) => !column.wideOnly).length;
                        // A column that is hidden on a phone is not in the grid there, so the group needs a span for each size.
                        return phoneColumns === group.columns.length
                          ? [
                              <th key={group.label} colSpan={group.columns.length} className="group-start text-center">
                                {group.label}
                              </th>,
                            ]
                          : [
                              <th key={`${group.label}-phone`} colSpan={phoneColumns} className="group-start text-center sm:hidden">
                                {group.label}
                              </th>,
                              <th key={group.label} colSpan={group.columns.length} className="group-start hidden text-center sm:table-cell">
                                {group.label}
                              </th>,
                            ];
                      })}
                    </tr>
                  ) : null}
                  <tr>
                    <th>
                      <HeaderTip tip="Position: rank by net rating">#</HeaderTip>
                    </th>
                    <th>Team</th>
                    {view.groups.flatMap((group, groupIndex) =>
                      group.columns.map((column, columnIndex) => (
                        <th
                          key={`${groupIndex}-${column.label}`}
                          className={`wrap-head${columnIndex === 0 ? " group-start" : ""}${column.wideOnly ? " hidden sm:table-cell" : ""}`}
                        >
                          <HeaderTip tip={column.tip}>
                            {/* A label breaks between words, never inside one ("W-L" at its hyphen). */}
                            {column.label.split(" ").map((word, wordIndex) => (
                              <span key={wordIndex} className="whitespace-nowrap">
                                {wordIndex > 0 ? " " : ""}
                                {word}
                              </span>
                            ))}
                          </HeaderTip>
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <AnimatedBody>
                  {standings.map((entry, index) => (
                    <AnimatedRow key={entry.clubCode} layout="position">
                      <td>
                        <span className="rank">{index + 1}</span>
                      </td>
                      <td>
                        <ClubCell entry={entry} seasonCode={seasonCode} shortName={shortNames?.get(entry.clubCode)} />
                      </td>
                      {view.groups.flatMap((group, groupIndex) =>
                        group.columns.map((column, columnIndex) => {
                          const placed = column.shade ? ranks[column.shade.key]?.get(entry.clubCode) : undefined;
                          const style = column.shade ? shadeStyle(placed?.rank, placed?.total ?? 0) : column.style?.(entry, context);
                          return (
                            <td
                              key={`${groupIndex}-${column.label}`}
                              className={`whitespace-nowrap tabular-nums${columnIndex === 0 ? " group-start" : ""}${column.strong ? " font-semibold" : ""}${column.shade ? " text-center font-semibold" : ""}${column.wideOnly ? " hidden sm:table-cell" : ""}`}
                              style={style}
                              title={placed ? `Rank ${placed.rank} of ${placed.total}` : undefined}
                            >
                              {column.render ? column.render(entry, context) : column.value(entry)}
                            </td>
                          );
                        }),
                      )}
                    </AnimatedRow>
                  ))}
                </AnimatedBody>
              </table>
            </ScrollingTable>
            <p className="px-1 py-2 text-xs text-base-content/70">
              Ordered by net rating. Values are cumulative through the selected round. Ratings are per 100 possessions.
            </p>
            {view.legend ? <p className="px-1 pb-2 text-xs text-base-content/70">{view.legend}</p> : null}
          </Panel>
          </>
          )}
        </motion.div>
      </TabPanel>
    </div>
  );
}
