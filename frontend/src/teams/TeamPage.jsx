import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import {
  getAdvancedStandings,
  getPhases,
  getSeasonStandings,
  getTeam,
  getTeamGames,
  getTeamCoaches,
  getTeamRoster,
  getTeamStatsSummary,
} from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDateTime, formatPerGame } from "../lib/format";
import { barFill, cardHover, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import PanelHeader from "../lib/PanelHeader";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import TeamAdvancedSection from "./TeamAdvancedSection";
import TeamLeagueProfile from "./TeamLeagueProfile";
import TeamQuickCompare from "./TeamQuickCompare";
import TeamRosterSection from "./TeamRosterSection";
import TeamShootingSection from "./TeamShootingSection";
import TeamStatisticsSection from "./TeamStatisticsSection";
import { fetchTeamRosterStats } from "./teamRosterStats";
import { advancedScopeForPhase, ordinal } from "./teamLeague";
import TrendChart from "../comparisons/TrendChart";

const MotionLink = motion.create(Link);

const ROSTER_LIMIT = 100;
const GAMES_LIMIT = 100;

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

function opponent(game, clubCode) {
  const home = game.localTeam?.clubCode === clubCode;
  return { team: home ? game.roadTeam : game.localTeam, home };
}

function statNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function NextGameChip({ nextGame, clubCode }) {
  if (!nextGame) return null;
  const { team, home } = opponent(nextGame, clubCode);
  return (
    <div className="next-chip ml-auto text-right">
      <span className="tag text-primary block text-xs font-bold uppercase tracking-wide">Next game</span>
      <span className="val block font-semibold">
        {home ? "vs" : "@"} {teamLabel(team)}
      </span>
      <span className="sub muted block text-sm">{formatDateTime(nextGame.scheduledAt)}</span>
    </div>
  );
}

const FORM_LIST_LIMIT = 5;
const UPCOMING_LIMIT = 5;

function gameRoundLabel(game) {
  return game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName);
}

// One compact line that opens the game: round, opponent, then whatever ends the line (a result or a tip-off time).
function GameLinkRow({ seasonCode, game, clubCode, children }) {
  const { team, home } = opponent(game, clubCode);
  return (
    <li className="flex flex-1">
      <Link
        to={`/${seasonCode}/games/${game.gameCode}`}
        className="flex w-full items-center gap-3 rounded-field border border-base-300 bg-base-200 px-3 py-2 text-sm transition-colors hover:border-primary"
      >
        <span className="muted w-16 flex-none truncate text-xs font-bold uppercase tracking-wide">
          {gameRoundLabel(game)}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">
          {home ? "vs" : "@"} {teamLabel(team)}
        </span>
        {children}
      </Link>
    </li>
  );
}

function RecentFormList({ seasonCode, games, clubCode }) {
  const recent = games
    .filter((game) => game.played)
    .slice()
    .reverse()
    .slice(0, FORM_LIST_LIMIT);

  return (
    <Panel as="section" className="flex flex-col p-4">
      <PanelHeader kicker="FORM" title="Recent form" />
      {recent.length === 0 ? (
        <EmptyText>No played games yet.</EmptyText>
      ) : (
        <ul className="flex flex-1 flex-col gap-2">
          {recent.map((game) => {
            const { home } = opponent(game, clubCode);
            const hasScores = game.localScore != null && game.roadScore != null;
            const clubScore = home ? game.localScore : game.roadScore;
            const opponentScore = home ? game.roadScore : game.localScore;
            const won = hasScores && clubScore > opponentScore;
            return (
              <GameLinkRow key={game.gameCode} seasonCode={seasonCode} game={game} clubCode={clubCode}>
                {hasScores ? (
                  <>
                    <span className={`flex-none text-xs font-bold uppercase tracking-wide ${won ? "text-success" : "text-error"}`}>
                      {won ? "Win" : "Loss"}
                    </span>
                    <span className="w-14 flex-none text-right font-semibold tabular-nums">
                      {clubScore}-{opponentScore}
                    </span>
                  </>
                ) : null}
              </GameLinkRow>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function UpcomingGamesList({ seasonCode, games, clubCode }) {
  const upcoming = games.filter((game) => !game.played).slice(0, UPCOMING_LIMIT);
  if (upcoming.length === 0) return null;

  return (
    <Panel as="section" className="flex flex-col p-4">
      <PanelHeader kicker="FIXTURES" title="Upcoming games" />
      <ul className="flex flex-1 flex-col gap-2">
        {upcoming.map((game) => (
          <GameLinkRow key={game.gameCode} seasonCode={seasonCode} game={game} clubCode={clubCode}>
            <span className="muted flex-none text-xs tabular-nums sm:text-sm">{formatDateTime(game.scheduledAt)}</span>
          </GameLinkRow>
        ))}
      </ul>
    </Panel>
  );
}

function currentStreak(phaseGames, clubCode) {
  const played = phaseGames
    .filter((game) => game.played && game.localScore != null && game.roadScore != null)
    .slice()
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  if (played.length === 0) return null;

  const wonGame = (game) => {
    const { home } = opponent(game, clubCode);
    return home ? game.localScore > game.roadScore : game.roadScore > game.localScore;
  };

  const first = wonGame(played[0]);
  let count = 0;
  for (const game of played) {
    if (wonGame(game) !== first) break;
    count += 1;
  }
  return { won: first, count };
}

const FORM_PILL_COUNT = 5;

// A horizontal bar filled to `share` (0-1) from the left, drawn with the shared bar-fill motion.
function ShareBar({ share, fillClass, trackClass }) {
  return (
    <div aria-hidden="true" className={`h-2.5 w-full overflow-hidden rounded-full ${trackClass}`}>
      <motion.div
        className={`h-full origin-left rounded-full ${fillClass}`}
        style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }}
        {...barFill}
      />
    </div>
  );
}

function SnapshotFact({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// The phase at a glance in one panel: the record as a win/loss bar with the last results and streak, points for and
// against as paired bars, and the remaining facts in a single row.
function TeamSnapshot({ standingsQuery, clubCode, phaseGames }) {
  if (standingsQuery.isPending) return <AsyncState status="loading" label="Loading the phase record" />;
  if (standingsQuery.isError) {
    return <AsyncState status="error" message="Could not load the phase record." onRetry={() => standingsQuery.refetch()} />;
  }
  const entry = standingsQuery.data.standings.find((row) => row.clubCode === clubCode);
  const basic = entry?.basic;
  if (!basic || !basic.gamesPlayed) {
    return <EmptyText>No record yet for this phase.</EmptyText>;
  }

  const gp = basic.gamesPlayed;
  const winShare = (basic.gamesWon ?? 0) / gp;
  const streak = currentStreak(phaseGames, clubCode);
  const form = phaseGames
    .filter((game) => game.played && game.localScore != null && game.roadScore != null)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(-FORM_PILL_COUNT)
    .map((game) => gameResult(game, clubCode));
  const gamesRemaining = phaseGames.filter((game) => !game.played).length;

  const pointsFor = basic.pointsFor != null ? basic.pointsFor / gp : null;
  const pointsAgainst = basic.pointsAgainst != null ? basic.pointsAgainst / gp : null;
  const diff = pointsFor != null && pointsAgainst != null ? pointsFor - pointsAgainst : null;
  const scale = Math.max(pointsFor ?? 0, pointsAgainst ?? 0) || 1;
  const diffText = diff == null ? "-" : `${diff > 0 ? "+" : ""}${formatPerGame(diff)}`;

  return (
    <Panel as="section" aria-label="Phase snapshot" className="p-5">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black tracking-tight tabular-nums">
                {basic.gamesWon ?? "-"}-{basic.gamesLost ?? "-"}
              </span>
              <span className="muted text-sm">{basic.winPercentage != null ? `${basic.winPercentage}% wins` : "Record"}</span>
            </div>
            {streak ? (
              <span className={`stat-badge ${streak.won ? "stat-badge-positive" : "stat-badge-negative"}`}>
                {streak.won ? "W" : "L"}
                {streak.count} streak
              </span>
            ) : null}
          </div>
          <ShareBar share={winShare} fillClass="bg-success" trackClass="bg-error/25" />
          <div className="mt-3 flex items-center gap-3">
            <span className="muted text-xs font-bold uppercase tracking-wide">Last {form.length}</span>
            <span className="form-track" role="img" aria-label={`Last results, oldest first: ${form.map((r) => (r === "win" ? "win" : "loss")).join(", ")}`}>
              {form.map((result, index) => (
                <span key={index} className={`form-pill ${result === "win" ? "w" : "l"}`}>
                  {result === "win" ? "W" : "L"}
                </span>
              ))}
            </span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="muted text-xs font-bold uppercase tracking-wide">Points per game</span>
            <span className={`stat-badge ${diff == null ? "stat-badge-neutral" : diff >= 0 ? "stat-badge-positive" : "stat-badge-negative"}`}>
              {diffText} diff
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="muted">Scored</span>
              <ShareBar share={(pointsFor ?? 0) / scale} fillClass="bg-primary" trackClass="bg-base-300" />
              <span className="text-right font-semibold tabular-nums">{formatPerGame(pointsFor)}</span>
            </div>
            <div className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="muted">Allowed</span>
              <ShareBar share={(pointsAgainst ?? 0) / scale} fillClass="bg-base-content/50" trackClass="bg-base-300" />
              <span className="text-right font-semibold tabular-nums">{formatPerGame(pointsAgainst)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-base-300 pt-4">
        <SnapshotFact
          label="League position"
          value={basic.position != null ? `${ordinal(basic.position)} of ${standingsQuery.data.standings.length}` : "-"}
        />
        <SnapshotFact label="Home" value={basic.homeRecord ?? "-"} />
        <SnapshotFact label="Away" value={basic.awayRecord ?? "-"} />
        <SnapshotFact label="Played" value={gp} />
        <SnapshotFact label="Remaining" value={gamesRemaining} />
      </div>
    </Panel>
  );
}

const LEADER_CATEGORIES = [
  { key: "pointsScored", label: "Points per game" },
  { key: "totalRebounds", label: "Rebounds per game" },
  { key: "assists", label: "Assists per game" },
  { key: "pir", label: "PIR per game" },
];

function TeamLeaders({ seasonCode, rosterStatsQuery }) {
  if (rosterStatsQuery.isPending) return <AsyncState status="loading" label="Loading team leaders" />;
  if (rosterStatsQuery.isError) {
    return <AsyncState status="error" message="Could not load team leaders." onRetry={() => rosterStatsQuery.refetch()} />;
  }
  const players = [...(rosterStatsQuery.data?.values() ?? [])];
  if (players.length === 0) {
    return <EmptyText>No statistics recorded yet for this phase.</EmptyText>;
  }

  return (
    <motion.div
      className="team-leaders-grid grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {LEADER_CATEGORIES.map((category) => {
        const ranked = players
          .map((player) => ({ player, value: statNumber(player.traditional?.[category.key]) }))
          .filter((row) => row.value != null)
          .sort((a, b) => b.value - a.value);
        const leader = ranked[0];
        if (!leader) {
          return (
            <div key={category.key} className="kpi-chip">
              <div className="kpi-chip-body">
                <span className="label">{category.label}</span>
                <span className="muted">-</span>
              </div>
            </div>
          );
        }
        return (
          <MotionLink
            key={category.key}
            to={`/${seasonCode}/players/${leader.player.personKey}`}
            className="kpi-chip kpi-chip-link"
            variants={listItem}
            {...cardHover}
          >
            <div className="kpi-chip-body">
              <span className="label">{category.label}</span>
              <span className="name">{leader.player.playerName ?? leader.player.personKey}</span>
              <span className="value">{formatPerGame(leader.value)}</span>
            </div>
            {leader.player.playerImageUrl ? (
              <img
                src={leader.player.playerImageUrl}
                alt=""
                className="kpi-chip-image"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </MotionLink>
        );
      })}
    </motion.div>
  );
}

function OverviewSection({ seasonCode, clubCode, team, phaseCode, standingsQuery, rosterStatsQuery, games }) {
  const nextGame = games.find((game) => !game.played) ?? null;
  const nextOpponent = nextGame ? opponent(nextGame, clubCode).team : null;
  const phaseGames = games.filter((game) => game.phaseCode === phaseCode);

  // One league-wide fetch feeds both the league profile and the quick comparison.
  const scope = advancedScopeForPhase(phaseCode);
  const advancedQuery = useQuery({
    queryKey: ["advanced-standings-team-overview", seasonCode, scope],
    queryFn: () => getAdvancedStandings(seasonCode, { scope }),
  });

  return (
    <div className="flex flex-col gap-6">
      <TeamSnapshot standingsQuery={standingsQuery} clubCode={clubCode} phaseGames={phaseGames} />
      <TeamLeaders seasonCode={seasonCode} rosterStatsQuery={rosterStatsQuery} />
      <TeamLeagueProfile advancedQuery={advancedQuery} clubCode={clubCode} team={team} />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* The last panel here grows to the comparison's height, so the two columns end together. */}
        <div className="flex flex-col gap-6 *:last:flex-1">
          <RecentFormList seasonCode={seasonCode} games={games} clubCode={clubCode} />
          <UpcomingGamesList seasonCode={seasonCode} games={games} clubCode={clubCode} />
        </div>
        <TeamQuickCompare
          seasonCode={seasonCode}
          clubCode={clubCode}
          team={team}
          nextOpponent={nextOpponent}
          standingsQuery={standingsQuery}
          advancedQuery={advancedQuery}
        />
      </div>
    </div>
  );
}

const ROLLING_WINDOW = 5;

function rollingAverage(values, window) {
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

const TREND_METRICS = [
  { key: "scored", label: "Points scored" },
  { key: "allowed", label: "Points allowed" },
  { key: "margin", label: "Margin" },
];

function TrendsSection({ games, phaseCode, clubCode }) {
  const [metric, setMetric] = useState("scored");

  const played = games
    .filter((game) => game.phaseCode === phaseCode && game.played && game.localScore != null && game.roadScore != null)
    .slice()
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  if (played.length < 2) {
    return <EmptyText>Not enough played games yet in this phase to chart trends.</EmptyText>;
  }

  const labels = played.map((game) => (game.roundNumber != null ? `R${game.roundNumber}` : formatDateTime(game.scheduledAt)));
  const scored = played.map((game) => {
    const { home } = opponent(game, clubCode);
    return home ? game.localScore : game.roadScore;
  });
  const allowed = played.map((game) => {
    const { home } = opponent(game, clubCode);
    return home ? game.roadScore : game.localScore;
  });
  const margin = scored.map((value, index) => value - allowed[index]);

  const seriesByMetric = { scored, allowed, margin };
  const values = seriesByMetric[metric];
  const activeLabel = TREND_METRICS.find((entry) => entry.key === metric).label;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-fit items-center gap-2 text-sm">
        Metric
        <select
          className="select select-sm select-bordered"
          value={metric}
          onChange={(event) => setMetric(event.target.value)}
        >
          {TREND_METRICS.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      <TrendChart
        title={activeLabel}
        labels={labels}
        series={[
          { label: activeLabel, points: values },
          { label: `${ROLLING_WINDOW}-game average`, points: rollingAverage(values, ROLLING_WINDOW) },
        ]}
      />
    </div>
  );
}

const GAMES_FILTERS = [
  { key: "all", label: "All" },
  { key: "results", label: "Results" },
  { key: "scheduled", label: "Scheduled" },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
];

function gameResult(game, clubCode) {
  if (!game.played || game.localScore == null || game.roadScore == null) return null;
  const { home } = opponent(game, clubCode);
  return (home ? game.localScore > game.roadScore : game.roadScore > game.localScore) ? "win" : "loss";
}

function filterAndOrderGames(games, clubCode, filter) {
  if (filter === "scheduled") {
    return games.filter((game) => !game.played).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }
  if (filter === "results") {
    return games.filter((game) => game.played).sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  }
  if (filter === "wins" || filter === "losses") {
    const want = filter === "wins" ? "win" : "loss";
    return games
      .filter((game) => gameResult(game, clubCode) === want)
      .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  }
  const scheduled = games.filter((game) => !game.played).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const results = games.filter((game) => game.played).sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  return [...scheduled, ...results];
}

function GamesSection({ gamesQuery, clubCode }) {
  const [filter, setFilter] = useState("all");

  if (gamesQuery.isPending) return <AsyncState status="loading" label="Loading the games" />;
  if (gamesQuery.isError) {
    return <AsyncState status="error" message="Could not load the games." onRetry={() => gamesQuery.refetch()} />;
  }
  const allGames = gamesQuery.data.games ?? [];
  if (allGames.length === 0) {
    return <EmptyText>No games scheduled yet.</EmptyText>;
  }
  const games = filterAndOrderGames(allGames, clubCode, filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          Filter
          <select
            className="select select-sm select-bordered"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {GAMES_FILTERS.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <span className="muted text-xs">
          {filter === "scheduled"
            ? "Nearest fixtures first"
            : filter === "all"
              ? "Nearest fixtures first · newest results first"
              : "Newest results first"}
        </span>
      </div>
      {games.length === 0 ? (
        <EmptyText>No games match this filter.</EmptyText>
      ) : (
      <Panel className="p-4">
      <ul>
        {games.map((game) => {
          const { team, home } = opponent(game, clubCode);
          const hasScores = game.localScore != null && game.roadScore != null;
          const teamWon = game.played && hasScores && (home ? game.localScore > game.roadScore : game.roadScore > game.localScore);
          const teamLost = game.played && hasScores && (home ? game.roadScore > game.localScore : game.localScore > game.roadScore);
          return (
            <li key={game.gameCode} className="flex items-center justify-between gap-4 border-b border-base-300 py-2 last:border-0">
              <div className="flex flex-col">
                <span>
                  {home ? "vs" : "@"} {teamLabel(team)}
                </span>
                <span className="muted text-sm">
                  {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)} ·{" "}
                  {formatDateTime(game.scheduledAt)}
                </span>
              </div>
              {game.played ? (
                <span
                  className={`stat-badge tabular-nums ${teamWon ? "stat-badge-positive" : teamLost ? "stat-badge-negative" : "stat-badge-neutral"}`}
                >
                  {game.localScore ?? "-"}-{game.roadScore ?? "-"}
                </span>
              ) : (
                <span className="muted text-sm">Not yet played</span>
              )}
            </li>
          );
        })}
      </ul>
      </Panel>
      )}
    </div>
  );
}

const SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "statistics", label: "Statistics" },
  { key: "roster", label: "Roster" },
  { key: "shooting", label: "Shooting" },
  { key: "advanced", label: "Advanced" },
  { key: "trends", label: "Trends" },
  { key: "games", label: "Games" },
];

export default function TeamPage() {
  const { seasonCode, clubCode } = useParams();
  const [section, setSection] = useState("overview");

  const teamQuery = useQuery({
    queryKey: ["team", seasonCode, clubCode],
    queryFn: () => getTeam(seasonCode, clubCode),
    retry: false,
  });
  const team = teamQuery.data?.team;
  useDocumentTitle(team ? (team.name ?? team.abbreviatedName ?? team.clubCode) : "Teams");

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
    enabled: teamQuery.isSuccess,
  });
  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode, setPhaseCode] = usePhaseParam(phases);

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
    enabled: teamQuery.isSuccess && Boolean(phaseCode),
  });

  const rosterQuery = useQuery({
    queryKey: ["team-roster", seasonCode, clubCode],
    queryFn: () => getTeamRoster(seasonCode, clubCode, { limit: ROSTER_LIMIT }),
    enabled: teamQuery.isSuccess,
  });

  const coachesQuery = useQuery({
    queryKey: ["team-coaches", seasonCode, clubCode],
    queryFn: () => getTeamCoaches(seasonCode, clubCode),
    enabled: teamQuery.isSuccess && section === "roster",
  });

  const rosterStatsQuery = useQuery({
    queryKey: ["team-roster-stats", seasonCode, phaseCode, clubCode],
    queryFn: () => fetchTeamRosterStats(seasonCode, phaseCode, clubCode),
    enabled: teamQuery.isSuccess && Boolean(phaseCode) && (section === "roster" || section === "overview"),
  });

  const gamesQuery = useQuery({
    queryKey: ["team-games", seasonCode, clubCode],
    queryFn: () => getTeamGames(seasonCode, clubCode, { limit: GAMES_LIMIT, order: "asc" }),
    enabled: teamQuery.isSuccess,
  });

  const teamStatsSummaryQuery = useQuery({
    queryKey: ["team-stats-summary", seasonCode, clubCode, phaseCode],
    queryFn: () => getTeamStatsSummary(seasonCode, clubCode, phaseCode),
    enabled: teamQuery.isSuccess && Boolean(phaseCode) && section === "statistics",
  });

  if (teamQuery.isLoading) return <AsyncState status="loading" label="Loading the team" />;

  if (teamQuery.isError) {
    const notFound = teamQuery.error?.response?.status === 404;
    return notFound ? (
      <EmptyText>Team not found.</EmptyText>
    ) : (
      <AsyncState status="error" message="Could not load this team." onRetry={() => teamQuery.refetch()} />
    );
  }

  const games = gamesQuery.data?.games ?? [];
  const nextGame = games.find((game) => !game.played) ?? null;

  return (
    <div>
      <PageHeader
        kicker="CLUB"
        title={team.name ?? team.abbreviatedName ?? team.clubCode}
        media={team.crestUrl ? <img src={team.crestUrl} alt="" className="h-16 w-16 object-contain" /> : null}
        description={
          <p className="muted">
            {team.abbreviatedName ?? team.clubCode} · {team.countryCode ?? "-"}
          </p>
        }
      >
        {gamesQuery.isSuccess ? <NextGameChip nextGame={nextGame} clubCode={clubCode} /> : null}
      </PageHeader>

      {section === "advanced" ? null : (
        <TabStrip
          ariaLabel="Phase"
          panelId="team-panel"
          activeKey={phaseCode}
          onChange={setPhaseCode}
          className="mb-4 w-fit"
          tabs={phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
        />
      )}

      <TabStrip
        ariaLabel="Section"
        panelId="team-panel"
        activeKey={section}
        onChange={setSection}
        className="mb-6 w-fit"
        tabs={SECTIONS}
      />

      <TabPanel id="team-panel" focusKey={`${phaseCode}-${section}`}>
        {section === "overview" ? (
          gamesQuery.isPending ? (
            <AsyncState status="loading" label="Loading this team's games" />
          ) : gamesQuery.isError ? (
            <AsyncState status="error" message="Could not load this team's games." onRetry={() => gamesQuery.refetch()} />
          ) : (
            <OverviewSection
              seasonCode={seasonCode}
              clubCode={clubCode}
              team={team}
              phaseCode={phaseCode}
              standingsQuery={standingsQuery}
              rosterStatsQuery={rosterStatsQuery}
              games={games}
            />
          )
        ) : section === "statistics" ? (
          <TeamStatisticsSection
            seasonCode={seasonCode}
            phaseCode={phaseCode}
            clubCode={clubCode}
            team={team}
            teamStatsSummaryQuery={teamStatsSummaryQuery}
          />
        ) : section === "shooting" ? (
          <TeamShootingSection
            key={`${seasonCode}-${clubCode}-${phaseCode}`}
            seasonCode={seasonCode}
            phaseCode={phaseCode}
            team={team}
            games={games}
          />
        ) : section === "advanced" ? (
          <TeamAdvancedSection
            key={`${seasonCode}-${clubCode}`}
            seasonCode={seasonCode}
            clubCode={clubCode}
            onOpenShooting={() => setSection("shooting")}
          />
        ) : section === "trends" ? (
          <TrendsSection games={games} phaseCode={phaseCode} clubCode={clubCode} />
        ) : section === "roster" ? (
          <TeamRosterSection
            rosterQuery={rosterQuery}
            rosterStatsQuery={rosterStatsQuery}
            coachesQuery={coachesQuery}
            seasonCode={seasonCode}
          />
        ) : (
          <GamesSection gamesQuery={gamesQuery} clubCode={clubCode} />
        )}
      </TabPanel>
    </div>
  );
}
