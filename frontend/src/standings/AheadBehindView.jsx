import { useState } from "react";
import { motion } from "motion/react";
import HeaderTip from "../lib/HeaderTip";
import AsyncState from "../lib/AsyncState";
import { formatSignedDecimal } from "../lib/format";
import { barFill, EASE_OUT, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { halfTimeRecords, marginStats, quarterProfile, shapeLabel } from "./breakdownUtils";
import { AnimatedBody, AnimatedRow } from "./motionTable";
import RecordBar from "./RecordBar";
import { ClubCell, PositionCell } from "./standingsCells";

const VIEWS = [
  { key: "quarters", label: "Net points per quarter" },
  { key: "shape", label: "Shape of a typical game" },
];

const SHAPE = { width: 200, height: 112, padLeft: 12, padRight: 34, middle: 54, top: 14 };
const STAGES = ["", "Q1", "Half", "Q3", "End"];

function tone(value) {
  return Math.abs(value) < 0.05 ? "" : value > 0 ? "is-pos" : "is-neg";
}

// Signed average margin with a bar under it: green to the right of the centre line, red to the left, one scale for all.
function QuarterCell({ value, maxAbs }) {
  const share = `${((Math.min(Math.abs(value), maxAbs) / maxAbs) * 100).toFixed(1)}%`;
  return (
    <div className="quarter-cell" title={`Average margin in this quarter: ${formatSignedDecimal(value)}`}>
      <span className={`quarter-num ${tone(value)}`}>{formatSignedDecimal(value)}</span>
      <span className="quarter-bar">
        <span className="half is-left">{value < 0 ? <motion.i style={{ width: share, originX: 1 }} {...barFill} /> : null}</span>
        <span className="mid" />
        <span className="half is-right">{value > 0 ? <motion.i style={{ width: share, originX: 0 }} {...barFill} /> : null}</span>
      </span>
    </div>
  );
}

// A team's average lead at the end of each quarter, from 0 at tip-off, on a scale shared by every card.
function ShapeChart({ profile, scale, clubName }) {
  const { width, height, padLeft, padRight, middle, top } = SHAPE;
  const step = (width - padLeft - padRight) / 4;
  const x = (index) => padLeft + index * step;
  const y = (value) => middle - (value / scale) * (middle - top);
  const { cumulative } = profile;
  const label = (index, anchor, dx, dy) => (
    <text x={x(index) + dx} y={y(cumulative[index]) + dy} textAnchor={anchor}>
      {formatSignedDecimal(cumulative[index])}
    </text>
  );

  return (
    <svg
      className="viz-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${clubName}: average margin at the end of each quarter`}
    >
      {[1, 2, 3, 4].map((index) => (
        <g key={index}>
          <line className="guide" x1={x(index)} x2={x(index)} y1={top - 6} y2={height - 16} />
          <text className="axis-text" x={x(index)} y={height - 4} textAnchor="middle">
            {STAGES[index]}
          </text>
        </g>
      ))}
      <line className="zero" x1={padLeft} x2={width - padRight} y1={middle} y2={middle} />
      <motion.polyline className="line" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.2, ease: EASE_OUT }} points={cumulative.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ")} />
      {cumulative.map((value, index) =>
        index === 0 ? null : (
          <circle key={index} className={`point ${value >= 0 ? "is-up" : "is-down"}`} cx={x(index).toFixed(1)} cy={y(value).toFixed(1)} r="3.4">
            <title>{`${STAGES[index]}: average margin ${formatSignedDecimal(value)}`}</title>
          </circle>
        ),
      )}
      {label(2, "middle", 0, cumulative[2] >= 0 ? -8 : 15)}
      {label(4, "start", 8, 3.5)}
    </svg>
  );
}

function TimeInFront({ flow }) {
  if (!flow) return <span className="muted">—</span>;
  const total = flow.timeLeadingSeconds + flow.timeTrailingSeconds + flow.timeTiedSeconds;
  if (!(total > 0)) return <span className="muted">—</span>;
  const share = (seconds) => `${((seconds / total) * 100).toFixed(1)}%`;
  return (
    <>
      <motion.div className="state-bar" style={{ originX: 0 }} {...barFill} role="img" aria-label={`In front for ${share(flow.timeLeadingSeconds)} of the game`}>
        <i className="is-lead" style={{ width: share(flow.timeLeadingSeconds) }} title={`Leading ${share(flow.timeLeadingSeconds)} of the time`} />
        <i className="is-tied" style={{ width: share(flow.timeTiedSeconds) }} title={`Tied ${share(flow.timeTiedSeconds)} of the time`} />
        <i className="is-trail" style={{ width: share(flow.timeTrailingSeconds) }} title={`Trailing ${share(flow.timeTrailingSeconds)} of the time`} />
      </motion.div>
      <div className="state-bar-text">
        <b>{Math.round((flow.timeLeadingSeconds / total) * 100)}%</b> of the game in front
      </div>
    </>
  );
}

export default function AheadBehindView({ standings, seasonCode, resultsQuery, resultsByClub, gameFlowQuery }) {
  const [view, setView] = useState("quarters");

  if (resultsQuery.isPending) return <AsyncState status="loading" label="Loading the quarter scores" />;
  if (resultsQuery.isError) {
    return <AsyncState status="error" message="Could not load the quarter scores." onRetry={() => resultsQuery.refetch()} />;
  }

  // Everything here comes from each club's own results and quarter scores, so it always agrees with the games played.
  const rows = standings.map((entry) => {
    const games = resultsByClub.get(entry.clubCode) ?? [];
    return { entry, profile: quarterProfile(games), stats: marginStats(games), halfTime: halfTimeRecords(games) };
  });
  const profiles = rows.flatMap((row) => (row.profile ? [row.profile] : []));
  if (profiles.length === 0) return <p className="muted">No quarter scores available yet for this phase.</p>;

  const maxQuarter = Math.max(0.1, ...profiles.flatMap((profile) => profile.quarters.map(Math.abs)));
  const shapeScale = Math.max(1, Math.ceil(Math.max(...profiles.flatMap((profile) => profile.cumulative.map(Math.abs)))));
  const flowByClub = new Map((gameFlowQuery.data?.clubs ?? []).map((club) => [club.clubCode, club]));

  return (
    <div className="breakdown-vis flex flex-col gap-6">
      <div>
        <p className="breakdown-legend">
          {view === "quarters" ? (
            <span>
              The average points a team wins (green, right) or loses (red, left) each quarter by, on one scale for every
              team. In NBA research the 1st and 3rd quarters predict winning best: good teams tend to get the lead early
              and hold on. Final includes overtime.
            </span>
          ) : (
            <span>
              Each line is a team&apos;s average lead at the end of each quarter, from 0 at tip-off. A line that climbs early
              is a <b>fast starter</b>; one that climbs late is a <b>strong finisher</b>. Same scale on every card.
            </span>
          )}
        </p>
        <TabStrip
          ariaLabel="Ahead and behind view"
          panelId="ahead-behind-panel"
          activeKey={view}
          onChange={setView}
          className="mb-3 w-fit"
          tabs={VIEWS}
        />
        <TabPanel id="ahead-behind-panel" focusKey={view} scroll={false}>
          {view === "quarters" ? (
            <Panel className="p-2">
              <PanelHeader kicker="QUARTERS" title="Who wins which quarter?" />
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="table breakdown-table">
                  <thead>
                    <tr>
                      <th><HeaderTip tip="Position: rank in the standings">#</HeaderTip></th>
                      <th>Team</th>
                      <th className="group-start"><HeaderTip tip="First quarter: average margin in it">Q1</HeaderTip></th>
                      <th><HeaderTip tip="Second quarter: average margin in it">Q2</HeaderTip></th>
                      <th><HeaderTip tip="Third quarter: average margin in it">Q3</HeaderTip></th>
                      <th><HeaderTip tip="Fourth quarter: average margin in it">Q4</HeaderTip></th>
                      <th className="group-start"><HeaderTip tip="Final margin: average over the whole game, overtime included">Final</HeaderTip></th>
                    </tr>
                  </thead>
                  <AnimatedBody>
                    {rows.map(({ entry, profile, stats }) => (
                      <AnimatedRow key={entry.clubCode}>
                        <td>
                          <PositionCell position={entry.basic?.position} qualified={entry.basic?.qualified} />
                        </td>
                        <td>
                          <ClubCell entry={entry} seasonCode={seasonCode} />
                        </td>
                        {profile ? (
                          profile.quarters.map((value, index) => (
                            <td key={index} className={index === 0 ? "group-start" : undefined}>
                              <QuarterCell value={value} maxAbs={maxQuarter} />
                            </td>
                          ))
                        ) : (
                          <td colSpan={4} className="group-start muted">
                            —
                          </td>
                        )}
                        <td className="group-start tabular-nums font-semibold">{stats ? formatSignedDecimal(stats.avgMargin) : "—"}</td>
                      </AnimatedRow>
                    ))}
                  </AnimatedBody>
                </table>
              </div>
            </Panel>
          ) : (
            <Panel className="p-2">
              <PanelHeader kicker="GAME SHAPE" title="The shape of a typical game" />
              <motion.div className="shape-cards" variants={listContainer} initial="hidden" animate="show">
                {rows.map(({ entry, profile }) => (
                  <motion.div key={entry.clubCode} className="shape-card" variants={listItem}>
                    <div className="shape-card-head">
                      {entry.crestUrl ? <img src={entry.crestUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                      <b title={entry.clubName ?? entry.clubCode}>{entry.clubName ?? entry.clubCode}</b>
                    </div>
                    {profile ? (
                      <>
                        <span className="shape-tag">{shapeLabel(profile)}</span>
                        <ShapeChart profile={profile} scale={shapeScale} clubName={entry.clubName ?? entry.clubCode} />
                      </>
                    ) : (
                      <p className="muted text-sm">No quarter scores yet.</p>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </Panel>
          )}
        </TabPanel>
      </div>

      <div>
        <p className="breakdown-legend">
          <span>
            <span className="legend-swatch" style={{ background: "var(--state-lead)" }} />
            Leading
          </span>
          <span>
            <span className="legend-swatch" style={{ background: "var(--state-tied)" }} />
            Tied
          </span>
          <span>
            <span className="legend-swatch" style={{ background: "var(--state-trail)" }} />
            Trailing
          </span>
        </p>
        <Panel className="p-2">
          <PanelHeader kicker="IN FRONT" title="Time in front, and what it is worth" />
          <p className="muted px-2 pb-2 text-sm">
            How much of the game each team spends leading, tied and trailing, how often the lead changes, and the record
            when a team leads or trails at half-time. The time figures come from play-by-play, so they exist only where it
            has been loaded.
          </p>
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="table breakdown-table">
              <thead>
                <tr>
                  <th><HeaderTip tip="Position: rank in the standings">#</HeaderTip></th>
                  <th>Team</th>
                  <th className="group-start"><HeaderTip tip="Share of the game spent leading, tied and trailing">Time leading / tied / trailing</HeaderTip></th>
                  <th><HeaderTip tip="Lead changes: times the lead swapped, per game">Lead changes</HeaderTip></th>
                  <th><HeaderTip tip="Biggest lead: largest lead of the season, in points">Biggest lead</HeaderTip></th>
                  <th className="group-start"><HeaderTip tip="Record when leading at half-time">Leading at half, won</HeaderTip></th>
                  <th><HeaderTip tip="Record when trailing at half-time">Trailing at half, won</HeaderTip></th>
                </tr>
              </thead>
              <AnimatedBody>
                {rows.map(({ entry, halfTime }) => {
                  const flow = flowByClub.get(entry.clubCode);
                  return (
                    <AnimatedRow key={entry.clubCode}>
                      <td>
                        <PositionCell position={entry.basic?.position} qualified={entry.basic?.qualified} />
                      </td>
                      <td>
                        <ClubCell entry={entry} seasonCode={seasonCode} />
                      </td>
                      <td className="group-start">
                        {gameFlowQuery.isPending ? <span className="muted">…</span> : <TimeInFront flow={flow} />}
                      </td>
                      <td className="tabular-nums">{flow?.leadChangesPerGame != null ? flow.leadChangesPerGame.toFixed(1) : "—"}</td>
                      <td className="tabular-nums">{flow?.largestLead ?? "—"}</td>
                      <td className="group-start">
                        <RecordBar record={halfTime.lead} label="Leading at half-time" />
                      </td>
                      <td>
                        <RecordBar record={halfTime.trail} label="Trailing at half-time" />
                      </td>
                    </AnimatedRow>
                  );
                })}
              </AnimatedBody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
