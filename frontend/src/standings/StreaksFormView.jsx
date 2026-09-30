import Panel from "../lib/Panel";
import { derivedFigures } from "./breakdownUtils";
import RecordBar from "./RecordBar";
import { ClubCell, PositionCell } from "./standingsCells";

function ResultsRibbon({ games, clubName }) {
  if (!games || games.length === 0) return <span className="muted">—</span>;
  const wins = games.filter((game) => game.pointsFor > game.pointsAgainst).length;
  return (
    <div className="results-ribbon" role="img" aria-label={`${clubName}: ${wins} wins and ${games.length - wins} losses, game by game`}>
      {games.map((game) => {
        const won = game.pointsFor > game.pointsAgainst;
        return (
          <i
            key={game.gameCode}
            className={`ribbon-dot ${won ? "is-win" : "is-loss"}`}
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
                <th>#</th>
                <th>Team</th>
                <th>Home</th>
                <th>Away</th>
                <th>Last 10</th>
                <th title="Longest winning streak this season">Longest W</th>
                <th title="Longest losing streak this season">Longest L</th>
                <th className="group-start">Season, game by game</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((entry) => {
                const games = resultsByClub.get(entry.clubCode);
                const figures = resultsQuery.isPending ? null : derivedFigures(games ?? []);
                return (
                <tr key={entry.clubCode}>
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

                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {resultsQuery.isError ? <p className="muted mt-2 text-sm">Could not load the game results for the ribbon.</p> : null}
    </div>
  );
}
