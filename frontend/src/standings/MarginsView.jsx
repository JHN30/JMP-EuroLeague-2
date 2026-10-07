import AsyncState from "../lib/AsyncState";
import { formatDecimal, formatSignedDecimal } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { CATEGORIES, derivedFigures, marginStats, sumRecords } from "./breakdownUtils";
import HeaderTip from "../lib/HeaderTip";
import MarginStrip from "./MarginStrip";
import { AnimatedBody, AnimatedRow } from "./motionTable";
import RecordBar from "./RecordBar";
import { ClubCell, PositionCell } from "./standingsCells";
import ScrollingTable from "./ScrollingTable";

const EXPECTED_WIDTH = 340;
const EXPECTED_HEIGHT = 26;
const EXPECTED_PAD = 8;

// Filled dot = actual wins, hollow dot = wins expected from points scored and allowed. A green link means the team won
// more than its scoring suggests, red means fewer.
function ExpectedWins({ wins, expected, low, high, clubName }) {
  const x = (value) => EXPECTED_PAD + ((value - low) / (high - low)) * (EXPECTED_WIDTH - EXPECTED_PAD * 2);
  const difference = wins - expected;
  const guides = [];
  for (let value = Math.ceil(low / 5) * 5; value <= high; value += 5) guides.push(value);

  return (
    <svg
      className="viz-svg"
      viewBox={`0 0 ${EXPECTED_WIDTH + 44} ${EXPECTED_HEIGHT}`}
      width={EXPECTED_WIDTH + 44}
      height={EXPECTED_HEIGHT}
      role="img"
      aria-label={`${clubName}: ${wins} wins against ${formatDecimal(expected)} expected`}
    >
      {guides.map((value) => (
        <line key={value} className="guide" x1={x(value)} x2={x(value)} y1="0" y2={EXPECTED_HEIGHT} />
      ))}
      <line className={difference >= 0 ? "link-up" : "link-down"} x1={x(expected)} x2={x(wins)} y1="13" y2="13" />
      <circle className="dot-expected" cx={x(expected)} cy="13" r="5">
        <title>{`Expected wins from points scored and allowed: ${formatDecimal(expected)}`}</title>
      </circle>
      <circle className="dot-actual" cx={x(wins)} cy="13" r="5">
        <title>{`Actual wins: ${wins}`}</title>
      </circle>
      <text x={EXPECTED_WIDTH + 6} y="17" style={{ fill: difference >= 0 ? "var(--win-4)" : "var(--loss-4)" }}>
        {formatSignedDecimal(difference)}
      </text>
    </svg>
  );
}

export default function MarginsView({ standings, seasonCode, shortNames, resultsQuery, resultsByClub, netByClub }) {
  if (resultsQuery.isPending) return <AsyncState status="loading" label="Loading margins" />;
  if (resultsQuery.isError) {
    return <AsyncState status="error" message="Could not load the margins." onRetry={() => resultsQuery.refetch()} />;
  }

  // Every figure comes from the club's own results, so it always agrees with the games played shown elsewhere.
  const rows = standings.map((entry) => {
    const games = resultsByClub.get(entry.clubCode) ?? [];
    return { entry, games, figures: derivedFigures(games), stats: marginStats(games) };
  });
  const maxMargin = Math.max(1, ...rows.flatMap(({ games }) => games.map((game) => Math.abs(game.pointsFor - game.pointsAgainst))));
  const league = Object.fromEntries(
    CATEGORIES.map((category) => [category.key, sumRecords(rows.map(({ figures }) => figures.categories[category.key]))]),
  );

  const expectedRows = rows.flatMap(({ entry }) => {
    const row = netByClub?.get(entry.clubCode);
    return row && row.pythagoreanWins !== null ? [{ entry, wins: row.wins, expected: row.pythagoreanWins }] : [];
  });
  const values = expectedRows.flatMap((row) => [row.wins, row.expected]);
  const low = Math.floor(Math.min(...values)) - 1;
  const high = Math.ceil(Math.max(...values)) + 1;
  const axisTicks = [];
  for (let value = Math.ceil(low / 5) * 5; value <= high; value += 5) axisTicks.push(value);

  return (
    <div className="breakdown-vis flex flex-col gap-6">
      <div>
        <p className="breakdown-legend">
          <span>
            <span className="legend-swatch" style={{ background: "var(--win-4)" }} />
            Win
          </span>
          <span>
            <span className="legend-swatch" style={{ background: "var(--loss-4)" }} />
            Loss
          </span>
          <span>
            One bar per game, oldest on the left. Up is a win, down is a loss, and the height is the points of margin. The
            scale is the same for every team, so a blowout looks like one. Hover a bar for the game.
          </span>
        </p>
        <Panel className="p-2">
          <PanelHeader kicker="MARGINS" title="How big were the wins and losses?" />
          <ScrollingTable>
            <table className="table breakdown-table pinned-table">
              <thead>
                <tr>
                  <th><HeaderTip tip="Position: rank in the standings">#</HeaderTip></th>
                  <th>Team</th>
                  <th className="group-start wrap-head"><HeaderTip tip="Average margin: points won or lost by, per game">Avg margin</HeaderTip></th>
                  <th className="wrap-head"><HeaderTip tip="Average win margin: points won by, in wins">Avg win</HeaderTip></th>
                  <th className="wrap-head"><HeaderTip tip="Average loss margin: points lost by, in losses">Avg loss</HeaderTip></th>
                  <th className="group-start"><HeaderTip tip="Margin of every game, oldest first: up is a win, down a loss">Season, game by game</HeaderTip></th>
                  <th className="wrap-head"><HeaderTip tip="Biggest win: largest winning margin">Biggest win</HeaderTip></th>
                  <th className="wrap-head"><HeaderTip tip="Biggest loss: largest losing margin">Biggest loss</HeaderTip></th>
                  <th className="wrap-head"><HeaderTip tip="Close games: record when decided by 3 points or fewer">Close (≤3)</HeaderTip></th>
                </tr>
              </thead>
              <AnimatedBody>
                {rows.map(({ entry, games, stats }) => (
                  <AnimatedRow key={entry.clubCode}>
                    <td>
                      <PositionCell position={entry.basic?.position} qualified={entry.basic?.qualified} />
                    </td>
                    <td>
                      <ClubCell entry={entry} seasonCode={seasonCode} shortName={shortNames?.get(entry.clubCode)} />
                    </td>
                    <td className="group-start tabular-nums font-semibold">{stats ? formatSignedDecimal(stats.avgMargin) : "—"}</td>
                    <td className="tabular-nums">{stats ? formatSignedDecimal(stats.avgWin) : "—"}</td>
                    <td className="tabular-nums">{stats ? formatSignedDecimal(stats.avgLoss) : "—"}</td>
                    <td className="group-start">
                      <MarginStrip games={games} clubName={entry.clubName ?? entry.clubCode} maxMargin={maxMargin} />
                    </td>
                    <td className="tabular-nums">{stats ? formatSignedDecimal(stats.biggestWin, 0) : "—"}</td>
                    <td className="tabular-nums">{stats ? formatSignedDecimal(stats.biggestLoss, 0) : "—"}</td>
                    <td title="Games decided by 3 points or fewer">{stats ? <RecordBar record={stats.close} label="Close games" /> : "—"}</td>
                  </AnimatedRow>
                ))}
              </AnimatedBody>
            </table>
          </ScrollingTable>
        </Panel>
      </div>

      {expectedRows.length > 0 ? (
        <Panel className="p-2">
          <PanelHeader kicker="EXPECTED WINS" title="Did the results match the scoring?" />
          <p className="muted px-2 pb-2 text-sm">
            Given the points a team scored and allowed, how many games should it have won (the Pythagorean expectation,
            also used by Cleaning the Glass and Basketball-Reference)?{" "}
            <span className="hidden sm:inline">
              <strong>Filled dot = wins, hollow dot = expected wins.</strong> A green link means it won more than its
              scoring suggests (strong in close games, or lucky); red means fewer.
            </span>
            <span className="sm:hidden">
              <strong>Diff = wins minus expected wins.</strong> Green means it won more than its scoring suggests (strong
              in close games, or lucky); red means fewer.
            </span>
          </p>
          <ScrollingTable>
            <table className="table breakdown-table pinned-table">
              <thead>
                <tr>
                  <th><HeaderTip tip="Position: rank in the standings">#</HeaderTip></th>
                  <th>Team</th>
                  <th className="group-start hidden sm:table-cell">
                    <svg className="viz-svg" viewBox={`0 0 ${EXPECTED_WIDTH + 44} 16`} width={EXPECTED_WIDTH + 44} height="16" aria-hidden="true">
                      {axisTicks.map((value) => (
                        <text
                          key={value}
                          className="axis-text"
                          x={EXPECTED_PAD + ((value - low) / (high - low)) * (EXPECTED_WIDTH - EXPECTED_PAD * 2)}
                          y="11"
                          textAnchor="middle"
                        >
                          {value}
                        </text>
                      ))}
                    </svg>
                  </th>
                  <th><HeaderTip tip="Wins: actual wins this season">Wins</HeaderTip></th>
                  <th><HeaderTip tip="Expected wins: wins the points scored and allowed suggest">Expected</HeaderTip></th>
                  <th className="sm:hidden"><HeaderTip tip="Difference: wins minus expected wins. Green means more wins than the scoring suggests">Diff</HeaderTip></th>
                </tr>
              </thead>
              <AnimatedBody>
                {expectedRows.map(({ entry, wins, expected }) => (
                  <AnimatedRow key={entry.clubCode}>
                    <td>
                      <PositionCell position={entry.basic?.position} qualified={entry.basic?.qualified} />
                    </td>
                    <td>
                      <ClubCell entry={entry} seasonCode={seasonCode} shortName={shortNames?.get(entry.clubCode)} />
                    </td>
                    <td className="group-start hidden sm:table-cell">
                      <ExpectedWins wins={wins} expected={expected} low={low} high={high} clubName={entry.clubName ?? entry.clubCode} />
                    </td>
                    <td className="tabular-nums">{wins}</td>
                    <td className="tabular-nums">{formatDecimal(expected)}</td>
                    <td className={`font-semibold tabular-nums sm:hidden ${wins - expected >= 0 ? "text-success" : "text-error"}`}>
                      {formatSignedDecimal(wins - expected)}
                    </td>
                  </AnimatedRow>
                ))}
              </AnimatedBody>
            </table>
          </ScrollingTable>
        </Panel>
      ) : null}

      <Panel className="p-2">
        <PanelHeader kicker="WHAT WINS GAMES" title="Record when the team beats its opponent in a category" />
        <p className="muted px-2 pb-2 text-sm">
          Each bar is the record in games where the team made <strong>more</strong> rebounds, assists, blocks,
          three-pointers, two-pointers or free throws than its opponent. Read a team against the league row at the bottom,
          which is the baseline.
        </p>
        <ScrollingTable>
          <table className="table breakdown-table pinned-table">
            <thead>
              <tr>
                <th><HeaderTip tip="Position: rank in the standings">#</HeaderTip></th>
                <th>Team</th>
                {CATEGORIES.map((category, index) => (
                  <th key={category.key} className={index === 0 ? "group-start" : undefined}>
                    <HeaderTip tip={`${category.label}: record in games with more than the opponent`}>
                      {category.label}
                    </HeaderTip>
                  </th>
                ))}
              </tr>
            </thead>
            <AnimatedBody>
              {rows.map(({ entry, figures }) => (
                <AnimatedRow key={entry.clubCode}>
                  <td>
                    <PositionCell position={entry.basic?.position} qualified={entry.basic?.qualified} />
                  </td>
                  <td>
                    <ClubCell entry={entry} seasonCode={seasonCode} shortName={shortNames?.get(entry.clubCode)} />
                  </td>
                  {CATEGORIES.map((category, index) => (
                    <td key={category.key} className={index === 0 ? "group-start" : undefined}>
                      <RecordBar record={figures.categories[category.key]} label={category.label} />
                    </td>
                  ))}
                </AnimatedRow>
              ))}
              <AnimatedRow className="font-bold">
                <td />
                <td>Whole league</td>
                {CATEGORIES.map((category, index) => (
                  <td key={category.key} className={index === 0 ? "group-start" : undefined}>
                    <RecordBar record={league[category.key]} label={`League, ${category.label}`} />
                  </td>
                ))}
              </AnimatedRow>
            </AnimatedBody>
          </table>
        </ScrollingTable>
      </Panel>
    </div>
  );
}
