import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import {
  getLeaderStats,
  getPhases,
  getSeasonStandings,
  getTeam,
  getTeamGames,
  getTeamRoster,
  getTeamStatsSummary,
} from "../lib/api";
import AsyncState from "../lib/AsyncState";
import CompactMetric from "../lib/CompactMetric";
import EmptyText from "../lib/EmptyText";
import { formatCount, formatDateTime, formatPerGame, formatPercentage } from "../lib/format";
import HeaderStats from "../lib/HeaderStats";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import PanelHeader from "../lib/PanelHeader";
import SeasonShootingChart from "../lib/SeasonShootingChart";
import { formatStatValue } from "../lib/statsFields";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import StatBarCell from "../statistics/StatBarCell";
import { barWidthScale } from "../statistics/statBarScale";
import TeamAdvancedSection from "./TeamAdvancedSection";
import TeamTrendChart from "./TeamTrendChart";
import TrendChart from "../comparisons/TrendChart";

const ROSTER_LIMIT = 100;
const GAMES_LIMIT = 100;
const ROSTER_STATS_PAGE_LIMIT = 100;
const ROSTER_STATS_MAX_PAGES = 5;

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

function opponent(game, clubCode) {
  const home = game.localTeam?.clubCode === clubCode;
  return { team: home ? game.roadTeam : game.localTeam, home };
}

async function fetchTeamRosterStats(seasonCode, phaseCode, clubCode) {
  const byPersonKey = new Map();
  let offset = 0;
  for (let page = 0; page < ROSTER_STATS_MAX_PAGES; page += 1) {
    const data = await getLeaderStats(seasonCode, {
      phase: phaseCode,
      mode: "perGame",
      limit: ROSTER_STATS_PAGE_LIMIT,
      offset,
    });
    for (const player of data.players) {
      if (player.clubCode === clubCode) byPersonKey.set(player.personKey, player);
    }
    if (!data.pagination.hasMore) break;
    offset += ROSTER_STATS_PAGE_LIMIT;
  }
  return byPersonKey;
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

function OverviewKpiStrip({ standingsQuery, clubCode }) {
  if (standingsQuery.isPending) return <AsyncState status="loading" label="Loading team KPIs" />;
  if (standingsQuery.isError) {
    return <AsyncState status="error" message="Could not load team KPIs." onRetry={() => standingsQuery.refetch()} />;
  }
  const entry = standingsQuery.data.standings.find((row) => row.clubCode === clubCode);
  const basic = entry?.basic;
  if (!basic || !basic.gamesPlayed) {
    return <EmptyText>Team KPIs not available yet for this phase.</EmptyText>;
  }
  const gp = basic.gamesPlayed;
  const perGame = (total) => formatPerGame(total != null ? total / gp : null);
  const perGameSigned = (total) => {
    if (total == null) return formatPerGame(null);
    const value = total / gp;
    return value > 0 ? `+${formatPerGame(value)}` : formatPerGame(value);
  };

  return (
    <HeaderStats>
      <CompactMetric value={perGame(basic.pointsFor)} label="Points for/game" />
      <CompactMetric value={perGame(basic.pointsAgainst)} label="Points against/game" />
      <CompactMetric value={perGameSigned(basic.pointsDifference)} label="Point diff/game" />
      <CompactMetric value={basic.winPercentage ?? "-"} label="Win %" />
      <CompactMetric value={gp} label="Games played" />
    </HeaderStats>
  );
}

function RecentFormList({ games, clubCode }) {
  const recent = games
    .filter((game) => game.played)
    .slice()
    .reverse()
    .slice(0, 5);

  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="FORM" title="Recent form" />
      {recent.length === 0 ? (
        <EmptyText>No played games yet.</EmptyText>
      ) : (
        <ul className="flex flex-col gap-2">
          {recent.map((game) => {
            const { team, home } = opponent(game, clubCode);
            const hasScores = game.localScore != null && game.roadScore != null;
            const won = hasScores && (home ? game.localScore > game.roadScore : game.roadScore > game.localScore);
            return (
              <li key={game.gameCode} className="rounded-field border border-base-300 bg-base-200 p-3">
                <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                  <span className="muted">
                    {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)}
                  </span>
                  <span className={won ? "text-success" : "text-error"}>{won ? "Win" : "Loss"}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>
                    {home ? "vs" : "@"} {teamLabel(team)}
                  </span>
                  <span className="tabular-nums">
                    {game.localScore ?? "-"}-{game.roadScore ?? "-"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function CompareShortcuts({ seasonCode, clubCode, nextGame, standingsQuery }) {
  const standings = standingsQuery.data?.standings ?? [];
  const nextOpponent = nextGame ? opponent(nextGame, clubCode).team : null;

  const leaderEntry = standings.find((row) => row.basic?.position === 1);
  const leaderIsSelf = leaderEntry?.clubCode === clubCode;
  const leaderTarget = leaderIsSelf ? standings.find((row) => row.basic?.position === 2) : leaderEntry;

  const links = [];
  if (nextOpponent?.clubCode) {
    links.push({ clubCode: nextOpponent.clubCode, label: `vs ${teamLabel(nextOpponent)}` });
  }
  if (leaderTarget && leaderTarget.clubCode !== clubCode && leaderTarget.clubCode !== nextOpponent?.clubCode) {
    links.push({
      clubCode: leaderTarget.clubCode,
      label: `vs ${leaderTarget.clubName ?? leaderTarget.clubCode} (league leader)`,
    });
  }

  if (links.length === 0) return null;

  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="SHORTCUTS" title="Compare" />
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <Link
            key={link.clubCode}
            to={`/${seasonCode}/comparisons?teamA=${encodeURIComponent(clubCode)}&teamB=${encodeURIComponent(link.clubCode)}`}
            className="link link-hover rounded-field border border-base-300 bg-base-200 p-3 text-sm font-semibold"
          >
            {link.label}
          </Link>
        ))}
      </div>
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

function PhaseTiles({ standingsQuery, clubCode, phaseGames }) {
  if (standingsQuery.isPending) return <AsyncState status="loading" label="Loading the phase record" />;
  if (standingsQuery.isError) {
    return <AsyncState status="error" message="Could not load the phase record." onRetry={() => standingsQuery.refetch()} />;
  }
  const entry = standingsQuery.data.standings.find((row) => row.clubCode === clubCode);
  const basic = entry?.basic;
  if (!basic || !basic.gamesPlayed) {
    return <EmptyText>No record yet for this phase.</EmptyText>;
  }

  const streak = currentStreak(phaseGames, clubCode);
  const gamesRemaining = phaseGames.filter((game) => !game.played).length;
  const diffPerGame = basic.pointsDifference != null ? basic.pointsDifference / basic.gamesPlayed : null;

  const tiles = [
    ["Record", `${basic.gamesWon ?? "-"}-${basic.gamesLost ?? "-"}`],
    ["Home", basic.homeRecord ?? "-"],
    ["Away", basic.awayRecord ?? "-"],
    ["Win %", basic.winPercentage ?? "-"],
    ["Point diff/game", diffPerGame != null ? (diffPerGame > 0 ? `+${formatPerGame(diffPerGame)}` : formatPerGame(diffPerGame)) : "-"],
    ["Current streak", streak ? `${streak.won ? "W" : "L"}${streak.count}` : "-"],
    ["Games remaining", gamesRemaining],
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map(([label, value]) => (
        <Panel key={label} className="p-3">
          <span className="block text-lg font-semibold">{value}</span>
          <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
        </Panel>
      ))}
    </div>
  );
}

const LEADER_CATEGORIES = [
  { key: "pointsScored", label: "Points" },
  { key: "totalRebounds", label: "Rebounds" },
  { key: "assists", label: "Assists" },
  { key: "pir", label: "PIR" },
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {LEADER_CATEGORIES.map((category) => {
        const ranked = players
          .map((player) => ({ player, value: statNumber(player.traditional?.[category.key]) }))
          .filter((row) => row.value != null)
          .sort((a, b) => b.value - a.value);
        const leader = ranked[0];
        return (
          <Panel key={category.key} className="p-3">
            {leader ? (
              <Link to={`/${seasonCode}/players/${leader.player.personKey}`} className="link link-hover">
                <span className="block font-semibold">{leader.player.playerName ?? leader.player.personKey}</span>
                <span className="text-primary text-lg font-bold tabular-nums">{formatPerGame(leader.value)}</span>
              </Link>
            ) : (
              <span className="muted">-</span>
            )}
            <span className="muted block text-xs font-bold uppercase tracking-wide">{category.label} leader</span>
          </Panel>
        );
      })}
    </div>
  );
}

function OverviewSection({ seasonCode, clubCode, phaseCode, standingsQuery, rosterStatsQuery, games }) {
  const nextGame = games.find((game) => !game.played) ?? null;
  const phaseGames = games.filter((game) => game.phaseCode === phaseCode);

  return (
    <div className="flex flex-col gap-6">
      <OverviewKpiStrip standingsQuery={standingsQuery} clubCode={clubCode} />
      <PhaseTiles standingsQuery={standingsQuery} clubCode={clubCode} phaseGames={phaseGames} />
      <TeamLeaders seasonCode={seasonCode} rosterStatsQuery={rosterStatsQuery} />
      <TeamTrendChart games={games} clubCode={clubCode} />
      <div className="grid gap-6 sm:grid-cols-2">
        <RecentFormList games={games} clubCode={clubCode} />
        <CompareShortcuts
          seasonCode={seasonCode}
          clubCode={clubCode}
          nextGame={nextGame}
          standingsQuery={standingsQuery}
        />
      </div>
    </div>
  );
}

function pct(made, attempted) {
  if (made == null || attempted == null || attempted === 0) return null;
  return (made / attempted) * 100;
}

function sumIfPresent(...values) {
  if (values.some((value) => value == null)) return null;
  return values.reduce((total, value) => total + value, 0);
}

function divideIfPresent(numerator, denominator) {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return numerator / denominator;
}

function shootingSplit(sums, madeKey, attemptedKey) {
  const made = sums[madeKey];
  const attempted = sums[attemptedKey];
  if (made == null || attempted == null) return formatCount(null);
  return `${formatCount(made)}-${formatCount(attempted)} (${formatPercentage(pct(made, attempted))})`;
}

function MetricTile({ label, value }) {
  return (
    <Panel className="p-3">
      <span className="block text-lg font-semibold tabular-nums">{value}</span>
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
    </Panel>
  );
}

function MetricGroup({ title, rows }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <MetricTile key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function traditionalRows(sums, gp) {
  const perGame = (key) => formatPerGame(divideIfPresent(sums[key], gp));
  return [
    ["Points", perGame("points")],
    ["Rebounds", perGame("totalRebounds")],
    ["Off. rebounds", perGame("offensiveRebounds")],
    ["Def. rebounds", perGame("defensiveRebounds")],
    ["Assists", perGame("assistances")],
    ["Steals", perGame("steals")],
    ["Blocks", perGame("blocksFavour")],
    ["Turnovers", perGame("turnovers")],
    ["Fouls committed", perGame("foulsCommited")],
    ["PIR", perGame("valuation")],
    ["2PT %", formatPercentage(pct(sums.fieldGoalsMade2, sums.fieldGoalsAttempted2))],
    ["3PT %", formatPercentage(pct(sums.fieldGoalsMade3, sums.fieldGoalsAttempted3))],
    ["FT %", formatPercentage(pct(sums.freeThrowsMade, sums.freeThrowsAttempted))],
  ];
}

function StatisticsSection({ teamStatsSummaryQuery }) {
  if (teamStatsSummaryQuery.isPending) return <AsyncState status="loading" label="Loading team statistics" />;
  if (teamStatsSummaryQuery.isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load team statistics."
        onRetry={() => teamStatsSummaryQuery.refetch()}
      />
    );
  }
  const { gamesPlayed, own, opponent: opp } = teamStatsSummaryQuery.data;
  if (!gamesPlayed) {
    return <EmptyText>This club did not play any games in the selected phase.</EmptyText>;
  }

  const eFgMade = own.fieldGoalsMade3 == null
    ? null
    : sumIfPresent(own.fieldGoalsMadeTotal, 0.5 * own.fieldGoalsMade3);
  const eFg = pct(eFgMade, own.fieldGoalsAttemptedTotal);
  const tsAttempts = own.freeThrowsAttempted == null
    ? null
    : sumIfPresent(own.fieldGoalsAttemptedTotal, 0.44 * own.freeThrowsAttempted);
  const trueShooting = pct(own.points, tsAttempts == null ? null : 2 * tsAttempts);
  const advancedRows = [
    ["eFG %", formatPercentage(eFg)],
    ["True shooting %", formatPercentage(trueShooting)],
    ["Assist/turnover", formatPerGame(divideIfPresent(own.assistances, own.turnovers))],
    ["Off. rebound %", formatPercentage(pct(own.offensiveRebounds, sumIfPresent(own.offensiveRebounds, opp.defensiveRebounds)))],
    ["Def. rebound %", formatPercentage(pct(own.defensiveRebounds, sumIfPresent(own.defensiveRebounds, opp.offensiveRebounds)))],
    ["Free throw rate", formatPercentage(pct(own.freeThrowsAttempted, own.fieldGoalsAttemptedTotal))],
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="muted text-sm">
        Scoped to the phase selected above - switching it changes every number in this tab.
      </p>
      <MetricGroup title="Traditional" rows={traditionalRows(own, gamesPlayed)} />
      <MetricGroup title="Advanced" rows={advancedRows} />
      <MetricGroup title="Opponent" rows={traditionalRows(opp, gamesPlayed)} />
    </div>
  );
}

function ShootingSection({ teamStatsSummaryQuery, seasonCode, phaseCode, team, games }) {
  const [presentation, setPresentation] = useState("heatmap");
  const [gameSegment, setGameSegment] = useState("all");
  const [result, setResult] = useState("all");

  if (teamStatsSummaryQuery.isPending) return <AsyncState status="loading" label="Loading shooting splits" />;
  if (teamStatsSummaryQuery.isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load shooting splits."
        onRetry={() => teamStatsSummaryQuery.refetch()}
      />
    );
  }
  const { gamesPlayed, own, opponent: opp } = teamStatsSummaryQuery.data;
  if (!gamesPlayed) {
    return <EmptyText>This club did not play any games in the selected phase.</EmptyText>;
  }

  const splits = [
    ["2PT", "fieldGoalsMade2", "fieldGoalsAttempted2"],
    ["3PT", "fieldGoalsMade3", "fieldGoalsAttempted3"],
    ["FT", "freeThrowsMade", "freeThrowsAttempted"],
  ];

  const playedGames = games.filter(
    (game) => game.phaseCode === phaseCode && game.played && game.localScore != null && game.roadScore != null,
  );

  return (
    <div className="flex flex-col gap-6">
      <Panel className="overflow-x-auto overscroll-x-contain p-2">
        <table className="table">
          <thead>
            <tr>
              <th>Splits</th>
              {splits.map(([label]) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-medium">This team</td>
              {splits.map(([label, made, attempted]) => (
                <td key={label} className="tabular-nums">
                  {shootingSplit(own, made, attempted)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="font-medium">Allowed</td>
              {splits.map(([label, made, attempted]) => (
                <td key={label} className="tabular-nums">
                  {shootingSplit(opp, made, attempted)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel className="p-4">
        <SeasonShootingChart
          seasonCode={seasonCode}
          playedGames={playedGames}
          ownerFilter={(shot) => shot.clubCode === team.clubCode}
          team={team}
          subjectLabel="Team"
          presentation={presentation}
          onPresentationChange={setPresentation}
          gameSegment={gameSegment}
          onGameSegmentChange={setGameSegment}
          result={result}
          onResultChange={setResult}
        />
      </Panel>
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

function RosterSection({ rosterQuery, rosterStatsQuery, seasonCode }) {
  if (rosterQuery.isPending) return <AsyncState status="loading" label="Loading the roster" />;
  if (rosterQuery.isError) {
    return <AsyncState status="error" message="Could not load the roster." onRetry={() => rosterQuery.refetch()} />;
  }
  const registrations = rosterQuery.data.registrations ?? [];
  if (registrations.length === 0) {
    return <EmptyText>Roster not available yet.</EmptyText>;
  }
  if (rosterStatsQuery.isPending) return <AsyncState status="loading" label="Loading roster statistics" />;
  if (rosterStatsQuery.isError) {
    return <AsyncState status="error" message="Could not load roster statistics." onRetry={() => rosterStatsQuery.refetch()} />;
  }

  const statsByPersonKey = rosterStatsQuery.data ?? new Map();
  const barScale = barWidthScale(
    registrations.map((entry) =>
      statNumber(statsByPersonKey.get(entry.player?.personKey)?.traditional?.pointsScored),
    ),
  );

  return (
    <Panel className="overflow-x-auto overscroll-x-contain p-2">
      <table className="data-table-sticky table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Position</th>
            <th>GP</th>
            <th>MIN</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>PIR</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((entry) => {
            const stats = entry.player ? statsByPersonKey.get(entry.player.personKey) : undefined;
            const traditional = stats?.traditional;
            const pts = statNumber(traditional?.pointsScored);
            const isFormer = entry.active === false;
            return (
              <tr key={entry.registrationKey}>
                <td>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-6 flex-none text-center text-xs text-base-content/60">
                      {entry.dorsal ?? "-"}
                    </span>
                    {stats?.playerImageUrl ? (
                      <img
                        src={stats.playerImageUrl}
                        alt=""
                        className="aspect-3/4 h-8 w-auto flex-none object-contain object-bottom"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        {entry.player ? (
                          <Link
                            to={`/${seasonCode}/players/${entry.player.personKey}`}
                            className="link link-hover max-w-32 truncate sm:max-w-48"
                            title={entry.player.name ?? "TBD"}
                          >
                            {entry.player.name ?? "TBD"}
                          </Link>
                        ) : (
                          <span className="max-w-32 truncate sm:max-w-48">TBD</span>
                        )}
                        {isFormer ? <span className="badge badge-ghost badge-xs">Former</span> : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{entry.positionName ?? "-"}</td>
                <td>{traditional?.gamesPlayed ?? "-"}</td>
                <td>{formatStatValue("minutesPlayed", traditional?.minutesPlayed)}</td>
                <StatBarCell widthPct={barScale(pts)}>
                  <span className="text-primary font-semibold tabular-nums">
                    {formatStatValue("pointsScored", traditional?.pointsScored)}
                  </span>
                </StatBarCell>
                <td>{traditional?.totalRebounds ?? "-"}</td>
                <td>{traditional?.assists ?? "-"}</td>
                <td>{traditional?.pir ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
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
  { key: "shooting", label: "Shooting" },
  { key: "advanced", label: "Advanced" },
  { key: "trends", label: "Trends" },
  { key: "roster", label: "Roster" },
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
    enabled: teamQuery.isSuccess && Boolean(phaseCode) && (section === "statistics" || section === "shooting"),
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
              phaseCode={phaseCode}
              standingsQuery={standingsQuery}
              rosterStatsQuery={rosterStatsQuery}
              games={games}
            />
          )
        ) : section === "statistics" ? (
          <StatisticsSection teamStatsSummaryQuery={teamStatsSummaryQuery} />
        ) : section === "shooting" ? (
          <ShootingSection
            teamStatsSummaryQuery={teamStatsSummaryQuery}
            seasonCode={seasonCode}
            phaseCode={phaseCode}
            team={team}
            games={games}
          />
        ) : section === "advanced" ? (
          <TeamAdvancedSection key={`${seasonCode}-${clubCode}`} seasonCode={seasonCode} clubCode={clubCode} />
        ) : section === "trends" ? (
          <TrendsSection games={games} phaseCode={phaseCode} clubCode={clubCode} />
        ) : section === "roster" ? (
          <RosterSection rosterQuery={rosterQuery} rosterStatsQuery={rosterStatsQuery} seasonCode={seasonCode} />
        ) : (
          <GamesSection gamesQuery={gamesQuery} clubCode={clubCode} />
        )}
      </TabPanel>
    </div>
  );
}
