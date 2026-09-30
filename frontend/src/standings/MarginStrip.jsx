const BAR = 6;
const GAP = 1;
const HEIGHT = 46;
const MIDDLE = 23;

// One bar per game, oldest on the left: up is a win, down is a loss, taller is a bigger margin. Every team uses the same
// scale (`maxMargin`), so a blowout looks like one wherever it appears.
export default function MarginStrip({ games, clubName, maxMargin }) {
  if (!games || games.length === 0) return <span className="muted">—</span>;
  const width = games.length * (BAR + GAP) - GAP;
  const pixelsPerPoint = (MIDDLE - 2) / Math.max(1, maxMargin);

  return (
    <svg
      className="viz-svg"
      viewBox={`0 0 ${width} ${HEIGHT}`}
      width={width}
      height={HEIGHT}
      role="img"
      aria-label={`${clubName}: the margin of each game, wins above the line and losses below`}
    >
      <line className="zero" x1="0" x2={width} y1={MIDDLE} y2={MIDDLE} />
      {games.map((game, index) => {
        const margin = game.pointsFor - game.pointsAgainst;
        const won = margin > 0;
        const height = Math.max(1.5, Math.abs(margin) * pixelsPerPoint);
        return (
          <rect
            key={game.gameCode}
            className={won ? "bar-win" : "bar-loss"}
            x={index * (BAR + GAP)}
            y={won ? MIDDLE - height : MIDDLE}
            width={BAR}
            height={height}
            rx="1"
          >
            <title>
              {`${game.roundNumber != null ? `Round ${game.roundNumber}: ` : ""}${game.home ? "vs" : "@"} ${game.opponentCode}, ${won ? "won" : "lost"} by ${Math.abs(margin)} (${game.pointsFor}-${game.pointsAgainst})`}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}
