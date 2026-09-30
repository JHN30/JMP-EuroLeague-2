import { motion } from "motion/react";
import HeaderTip from "../lib/HeaderTip";
import { EASE_OUT } from "../lib/motion";
import Panel from "../lib/Panel";
import { derivedFigures } from "./breakdownUtils";
import { AnimatedBody, AnimatedRow } from "./motionTable";
import RecordBar from "./RecordBar";
import { ClubCell, PositionCell } from "./standingsCells";

function ResultsRibbon({ games, clubName }) {
  if (!games || games.length === 0) return <span className="muted">—</span>;
  const wins = games.filter((game) => game.pointsFor > game.pointsAgainst).length;
  return (
    <div className="results-ribbon" role="img" aria-label={`${clubName}: ${wins} wins and ${games.length - wins} losses, game by game`}>
      {games.map((game, index) => {
        const won = game.pointsFor > game.pointsAgainst;
        return (
          <motion.i
            key={game.gameCode}
            className={`ribbon-dot ${won ? "is-win" : "is-loss"}`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.3, delay: 0.1 + index * 0.01, ease: EASE_OUT }}
            title={`${game.roundNumber != null ? `Round ${game.roundNumber}: ` : ""}${game.home ? "vs" : "@"} ${game.opponentCode}, ${won ? "won" : "lost"} ${game.pointsFor}-${game.pointsAgainst}`}
          />
        );
      })}
    </div>
  );
}

export default function StreaksFormView({ standings, seasonCode, resultsQuery, resultsByClub }) {
  return (
    <div className="breakdown-vis">
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
          The season, game by game, oldest on the left. Long runs of one colour are streaks; hover a bar for the game.
          Bars under Home, Away and Last 10 show the win share of each record.
        </span>
      </p>
      <Panel className="p-2">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="table breakdown-table">
            <thead>
              <tr>
                <th><HeaderTip tip="Position: rank in the standings">#</HeaderTip></th>
                <th>Team</th>
                <th><HeaderTip tip="Home record: wins and losses at home">Home</HeaderTip></th>
                <th><HeaderTip tip="Away record: wins and losses on the road">Away</HeaderTip></th>
                <th><HeaderTip tip="Last 10: record in the last 10 games">Last 10</HeaderTip></th>
                <th><HeaderTip tip="Longest winning streak: most wins in a row this season">Longest W</HeaderTip></th>
                <th><HeaderTip tip="Longest losing streak: most losses in a row this season">Longest L</HeaderTip></th>
                <th className="group-start"><HeaderTip tip="Every game, oldest first: green is a win, red a loss">Season, game by game</HeaderTip></th>
              </tr>
            </thead>
            <AnimatedBody>
              {standings.map((entry) => {
                const games = resultsByClub.get(entry.clubCode);
                const figures = resultsQuery.isPending ? null : derivedFigures(games ?? []);
                return (
                <AnimatedRow key={entry.clubCode}>
                  <td>
                    <PositionCell position={entry.basic?.position} qualified={entry.basic?.qualified} />
                  </td>
                  <td>
                    <ClubCell entry={entry} seasonCode={seasonCode} />
                  </td>
                  <td>
                    <RecordBar record={entry.basic?.homeRecord} label="Home" />
                  </td>
                  <td>
                    <RecordBar record={entry.basic?.awayRecord} label="Away" />
                  </td>
                  <td>
                    <RecordBar record={entry.basic?.lastTenRecord} label="Last 10" />
                  </td>
                  <td className="tabular-nums">{figures ? figures.longestWin : "…"}</td>
                  <td className="tabular-nums">{figures ? figures.longestLoss : "…"}</td>
                  <td className="group-start">
                    {resultsQuery.isPending ? (
                      <span className="muted">…</span>
                    ) : (
                      <ResultsRibbon games={games} clubName={entry.clubName ?? entry.clubCode} />
                    )}
                  </td>

                </AnimatedRow>
                );
              })}
            </AnimatedBody>
          </table>
        </div>
      </Panel>
      {resultsQuery.isError ? <p className="muted mt-2 text-sm">Could not load the game results for the ribbon.</p> : null}
    </div>
  );
}
