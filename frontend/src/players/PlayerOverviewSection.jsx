import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { motion } from "motion/react";
import { Link } from "react-router";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatPerGame, formatPercentage, formatSignedDecimal } from "../lib/format";
import HomeAwayIcon from "../lib/HomeAwayIcon";
import { barFill, listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import { formatStatValue } from "../lib/statsFields";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";
import { ordinal, rankTier } from "../teams/teamLeague";
import { PROFILE_AXES, SEASON_LINE, rankPlayer, statNumber } from "./playerOverview";

const FORM_GAMES = 10;
const MIN_FORM_BAR_POINTS = 10;

// ---- Season line: the per-game numbers, each with where it ranks in the league ----

function RankedStat({ stat, ranking, minGames }) {
  const { rank, of, value, unqualified } = ranking;
  const tier = rank ? rankTier({ rank, of }) : null;
  const fill = rank && of > 1 ? ((of - rank) / (of - 1)) * 100 : 0;

  return (
    <motion.div className="rounded-box border border-base-300 bg-base-100 p-3" variants={listItem} title={stat.title}>
      <div className="flex items-center justify-between gap-2">
        <span className="muted text-xs font-bold uppercase tracking-wide">{stat.label}</span>
        {rank ? <span className={`text-xs font-bold tabular-nums ${tier.text}`}>#{rank}</span> : null}
      </div>
      <p className="mt-1 text-3xl font-black leading-none tabular-nums">{formatPerGame(value)}</p>
      <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded-full bg-base-300">
        {rank ? (
          <motion.div
            className={`h-full rounded-full ${tier.bar}`}
            style={{ width: `${Math.max(fill, 4)}%`, transformOrigin: "left" }}
            {...barFill}
          />
        ) : null}
      </div>
      <p className="muted mt-1 text-xs">
        {rank ? `${ordinal(rank)} of ${of}` : unqualified ? `Not ranked: under ${minGames} games` : "No recorded stats"}
      </p>
    </motion.div>
  );
}

function SeasonLine({ players, personKey, minGames }) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {SEASON_LINE.map((stat) => (
        <RankedStat key={stat.label} stat={stat} ranking={rankPlayer(players, personKey, stat, { qualifiedOnly: true })} minGames={minGames} />
      ))}
    </motion.div>
  );
}

// ---- Profile: six percentiles on a radar, and the best and weakest of them ----

function ProfileRadar({ axes }) {
  const canvasRef = useRef(null);
  const theme = useActiveTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const primary = themeColor(canvas, "--color-primary");
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;

    const chart = new Chart(canvas, {
      type: "radar",
      data: {
        labels: axes.map((axis) => axis.label),
        datasets: [
          {
            label: "Percentile",
            data: axes.map((axis) => axis.percentile ?? 0),
            borderColor: primary,
            backgroundColor: `color-mix(in srgb, ${primary} 25%, transparent)`,
            borderWidth: 2,
            pointBackgroundColor: primary,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 25, color: textColor, backdropColor: "transparent" },
            grid: { color: gridColor },
            angleLines: { color: gridColor },
            pointLabels: { color: textColor },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (context) => `${context.label}: ${ordinal(context.parsed.r)} percentile` } },
        },
      },
    });
    return () => chart.destroy();
  }, [axes, theme]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={canvasRef} role="img" aria-label={`Percentile radar across ${axes.map((axis) => axis.label).join(", ")}`} />
    </div>
  );
}

function ProfilePanel({ players, personKey }) {
  const axes = PROFILE_AXES.map((axis) => ({ ...axis, ...rankPlayer(players, personKey, axis, { qualifiedOnly: true }) }));
  const ranked = axes.filter((axis) => axis.percentile !== null).sort((a, b) => b.percentile - a.percentile);
  const best = ranked[0];
  const weakest = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  return (
    <Panel className="p-4">
      <PanelHeader kicker="PERCENTILE 0-100" title="Profile" />
      {ranked.length === 0 ? (
        <p className="muted text-sm">Not enough recorded stats yet to chart percentiles.</p>
      ) : (
        <>
          <ProfileRadar axes={axes} />
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="badge badge-success badge-outline">
              Strongest: {best.label} · {ordinal(best.percentile)} percentile
            </span>
            {weakest ? (
              <span className="badge badge-error badge-outline">
                Weakest: {weakest.label} · {ordinal(weakest.percentile)} percentile
              </span>
            ) : null}
          </div>
        </>
      )}
    </Panel>
  );
}

// ---- Form: the last games, a bar of points each, green for a win and red for a loss ----

function playedGames(games) {
  return games
    .filter((game) => game.played && statNumber(game.timePlayed) > 0)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

// Box-score numbers arrive as "14.0"; a single game has whole numbers.
function wholeNumber(raw) {
  const number = statNumber(raw);
  return number === null ? "—" : Math.round(number);
}

function gameWon(game) {
  if (game.localScore == null || game.roadScore == null) return null;
  return game.side === "local" ? game.localScore > game.roadScore : game.roadScore > game.localScore;
}

function averageOf(games, field) {
  const values = games.map((game) => statNumber(game[field])).filter((value) => value !== null);
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// The recent average, and (when the recent games are only part of the season) how far it is from the season average.
// A difference that rounds to 0.0 is shown plainly, not as a gain or a loss.
function FormDelta({ label, recent, season, compare }) {
  if (recent === null) return null;
  const delta = compare && season !== null ? Math.round((recent - season) * 10) / 10 : null;
  const tone = delta === 0 ? "muted" : delta > 0 ? "text-success" : "text-error";
  return (
    <div className="flex flex-col">
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
      <span className="text-xl font-bold tabular-nums">{formatPerGame(recent)}</span>
      {delta !== null ? (
        <span className={`text-xs font-semibold tabular-nums ${tone}`} title="Against the season average">
          {delta === 0 ? "same as season" : formatSignedDecimal(delta)}
        </span>
      ) : null}
    </div>
  );
}

function FormBar({ game, seasonCode, height }) {
  const points = statNumber(game.points) ?? 0;
  const won = gameWon(game);
  const opponent = game.side === "local" ? game.roadTeam : game.localTeam;
  const home = game.side === "local";
  const tone = won === null ? "bg-base-content/40" : won ? "bg-success" : "bg-error";
  const label = `${game.roundName ?? "Game"} ${home ? "vs" : "at"} ${opponent?.name ?? "opponent"}: ${points} points, ${
    won === null ? "no result" : won ? "win" : "loss"
  }`;

  return (
    <motion.li className="min-w-0 flex-1" variants={listItem}>
      <Link
        to={`/${seasonCode}/games/${game.gameCode}`}
        title={label}
        aria-label={label}
        className="group flex h-full flex-col items-center gap-1.5 rounded-field px-0.5 pb-1 hover:bg-base-200"
      >
        <span className="text-sm font-bold tabular-nums">{points}</span>
        <div className="flex h-28 w-full items-end justify-center">
          <motion.div
            className={`w-full max-w-7 rounded-t-field ${tone}`}
            style={{ height: `${height}%`, transformOrigin: "bottom" }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        {opponent?.crestUrl ? (
          <RevealImage src={opponent.crestUrl} className="h-5 w-5 object-contain" />
        ) : (
          <span className="h-5" />
        )}
        <HomeAwayIcon home={home} className="h-3.5 w-3.5 text-base-content/60" />
      </Link>
    </motion.li>
  );
}

function FormPanel({ gamesQuery, own, seasonCode }) {
  let body;
  let kicker = `LAST ${FORM_GAMES} GAMES`;
  if (gamesQuery.isPending) {
    body = <AsyncState status="loading" label="Loading recent games" />;
  } else if (gamesQuery.isError) {
    body = <AsyncState status="error" message="Could not load the recent games." onRetry={() => gamesQuery.refetch()} />;
  } else {
    const games = playedGames(gamesQuery.data.games ?? []);
    const recent = games.slice(-FORM_GAMES);
    // With ten games or fewer the recent games are the whole season, so there is nothing to compare them with.
    const compare = games.length > recent.length;
    if (!compare) kicker = recent.length === 1 ? "THE ONLY GAME" : `ALL ${recent.length} GAMES`;
    if (recent.length === 0) {
      body = <EmptyText>No games played yet.</EmptyText>;
    } else {
      const top = Math.max(MIN_FORM_BAR_POINTS, ...recent.map((game) => statNumber(game.points) ?? 0));
      const best = games.reduce((most, game) => ((statNumber(game.valuation) ?? -Infinity) > (statNumber(most.valuation) ?? -Infinity) ? game : most));
      const bestOpponent = best.side === "local" ? best.roadTeam : best.localTeam;
      const season = own?.traditional;

      body = (
        <>
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
            <FormDelta label="PTS" recent={averageOf(recent, "points")} season={statNumber(season?.pointsScored)} compare={compare} />
            <FormDelta label="REB" recent={averageOf(recent, "totalRebounds")} season={statNumber(season?.totalRebounds)} compare={compare} />
            <FormDelta label="AST" recent={averageOf(recent, "assistances")} season={statNumber(season?.assists)} compare={compare} />
            <FormDelta label="PIR" recent={averageOf(recent, "valuation")} season={statNumber(season?.pir)} compare={compare} />
          </div>
          <motion.ol className="flex gap-1" variants={listContainer} initial="hidden" animate="show">
            {recent.map((game) => (
              <FormBar key={game.gameCode} game={game} seasonCode={seasonCode} height={Math.max(4, ((statNumber(game.points) ?? 0) / top) * 100)} />
            ))}
          </motion.ol>
          <Link
            to={`/${seasonCode}/games/${best.gameCode}`}
            className="mt-4 flex flex-wrap items-baseline gap-x-2 rounded-field border border-base-300 px-3 py-2 text-sm hover:border-primary"
          >
            <span className="muted text-xs font-bold uppercase tracking-wide">Best game</span>
            <span className="font-semibold tabular-nums">
              {wholeNumber(best.points)} pts · {wholeNumber(best.totalRebounds)} reb · {wholeNumber(best.assistances)} ast · PIR {wholeNumber(best.valuation)}
            </span>
            <span className="muted">
              {best.side === "local" ? "vs" : "at"} {bestOpponent?.name ?? "opponent"} · {best.roundName}
            </span>
          </Link>
        </>
      );
    }
  }

  return (
    <Panel className="p-4">
      <PanelHeader kicker={kicker} title="Recent form" />
      {body}
    </Panel>
  );
}

// ---- Shooting: how well each kind of shot goes in, and where the points come from ----

function ShotRow({ label, made, attempted, percentage }) {
  const pct = statNumber(percentage);
  return (
    <li className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3">
      <span className="text-sm font-bold">{label}</span>
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-base-300">
        {pct !== null ? (
          <motion.div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%`, transformOrigin: "left" }} {...barFill} />
        ) : null}
      </div>
      <span className="w-28 text-right text-sm tabular-nums">
        <b>{formatPercentage(percentage)}</b>
        <span className="muted ml-1.5 text-xs">
          {formatPerGame(made)}/{formatPerGame(attempted)}
        </span>
      </span>
    </li>
  );
}

function EfficiencyChip({ label, title, ranking, field }) {
  const { value, rank, of } = ranking;
  return (
    <div className="flex flex-col" title={title}>
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
      <span className="text-xl font-bold tabular-nums">{formatStatValue(field, value)}</span>
      <span className={`text-xs tabular-nums ${rank ? rankTier({ rank, of }).text : "muted"}`}>
        {rank ? `${ordinal(rank)} of ${of}` : "Too few games to rank"}
      </span>
    </div>
  );
}

const POINT_SOURCES = [
  { key: "pointsFromTwoPointersPercentage", label: "Twos", bar: "bg-primary" },
  { key: "pointsFromThreePointersPercentage", label: "Threes", bar: "bg-accent" },
  { key: "pointsFromFreeThrowsPercentage", label: "Free throws", bar: "bg-base-content/50" },
];

function ShootingPanel({ own, players, personKey }) {
  const traditional = own?.traditional;
  const trueShooting = rankPlayer(players, personKey, { group: "advanced", field: "trueShootingPercentage" }, { qualifiedOnly: true });
  const effective = rankPlayer(players, personKey, { group: "advanced", field: "effectiveFieldGoalPercentage" }, { qualifiedOnly: true });
  const sources = POINT_SOURCES.map((source) => ({ ...source, value: statNumber(own?.scoring?.[source.key]) }));
  const hasSources = sources.some((source) => source.value !== null && source.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <PanelHeader kicker="PER GAME" title="Shooting" />
        <ul className="flex flex-col gap-3">
          <ShotRow label="2PT" made={traditional?.twoPointersMade} attempted={traditional?.twoPointersAttempted} percentage={traditional?.twoPointersPercentage} />
          <ShotRow label="3PT" made={traditional?.threePointersMade} attempted={traditional?.threePointersAttempted} percentage={traditional?.threePointersPercentage} />
          <ShotRow label="FT" made={traditional?.freeThrowsMade} attempted={traditional?.freeThrowsAttempted} percentage={traditional?.freeThrowsPercentage} />
        </ul>
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t border-base-300 pt-4">
          <EfficiencyChip label="TS%" title="True shooting: points per shooting possession, counting free throws and threes" ranking={trueShooting} field="trueShootingPercentage" />
          <EfficiencyChip label="eFG%" title="Effective field goal percentage: field goals with threes weighted 1.5" ranking={effective} field="effectiveFieldGoalPercentage" />
        </div>
      </Panel>

      <Panel className="p-4">
        <PanelHeader kicker="SHARE OF POINTS" title="Where the points come from" />
        {hasSources ? (
          <>
            <div className="flex h-5 overflow-hidden rounded-full bg-base-300" role="img" aria-label={sources.map((source) => `${source.label} ${formatPercentage(source.value)}`).join(", ")}>
              {sources.map((source) => (
                <motion.div
                  key={source.key}
                  className={`h-full ${source.bar}`}
                  style={{ width: `${source.value ?? 0}%`, transformOrigin: "left" }}
                  {...barFill}
                />
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-3 gap-3">
              {sources.map((source) => (
                <li key={source.key}>
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide muted">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${source.bar}`} />
                    {source.label}
                  </span>
                  <span className="text-2xl font-bold tabular-nums">{formatPercentage(source.value)}</span>
                </li>
              ))}
            </ul>
            <p className="muted mt-4 text-xs">Of every point scored, how many came from twos, threes and free throws.</p>
          </>
        ) : (
          <p className="muted text-sm">No scoring recorded yet.</p>
        )}
      </Panel>
    </div>
  );
}

// ---- The tab ----

export default function PlayerOverviewSection({ leaderboardQuery, gamesQuery, personKey, seasonCode }) {
  if (leaderboardQuery.isPending) return <AsyncState status="loading" label="Loading league rankings" />;
  if (leaderboardQuery.isError) {
    return <AsyncState status="error" message="Could not load league rankings." onRetry={() => leaderboardQuery.refetch()} />;
  }
  const players = leaderboardQuery.data;
  const own = players.find((player) => player.personKey === personKey);
  if (!own) return <EmptyText>No recorded stats for this player in this phase yet.</EmptyText>;

  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.section variants={sectionItem} aria-label="Season line">
        {own.qualified === false ? (
          <p className="mb-3 rounded-field border border-base-300 bg-base-100 px-3 py-2 text-sm">
            <span className="font-semibold">Not ranked yet:</span> {statNumber(own.traditional?.gamesPlayed)} games played, and the league ranks players
            from {own.minGames} games in this phase.{own.isCalculated ? " These per-game numbers are worked out from the player's season totals." : ""}
          </p>
        ) : null}
        <SeasonLine players={players} personKey={personKey} minGames={own.minGames} />
      </motion.section>
      <motion.section className="grid gap-4 lg:grid-cols-2" variants={sectionItem} aria-label="Profile and form">
        <ProfilePanel players={players} personKey={personKey} />
        <FormPanel gamesQuery={gamesQuery} own={own} seasonCode={seasonCode} />
      </motion.section>
      <motion.section variants={sectionItem} aria-label="Shooting">
        <ShootingPanel own={own} players={players} personKey={personKey} />
      </motion.section>
    </motion.div>
  );
}
