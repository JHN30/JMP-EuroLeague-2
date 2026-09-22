import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getLeaderStats, getPhases, getSeasonStandings, getTeam, getTeamGames, getTeamRoster } from "../lib/api";
import { formatStatValue } from "../lib/statsFields";
import StatBarCell from "../statistics/StatBarCell";
import { barWidthScale } from "../statistics/statBarScale";
import TeamTrendChart from "./TeamTrendChart";

const ROSTER_LIMIT = 100;
const GAMES_LIMIT = 100;
const ROSTER_STATS_PAGE_LIMIT = 100;
const ROSTER_STATS_MAX_PAGES = 5;

function CenteredSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex justify-center py-12">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function ErrorAlert({ message, onRetry }) {
  return (
    <div role="alert" className="alert alert-error max-w-md">
      <span>{message}</span>
      <button type="button" className="btn btn-sm" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function formatDateTime(scheduledAt) {
  if (!scheduledAt) return "TBD";
  return new Date(scheduledAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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
  if (standingsQuery.isPending) return <CenteredSpinner />;
  if (standingsQuery.isError) {
    return <ErrorAlert message="Could not load team KPIs." onRetry={() => standingsQuery.refetch()} />;
  }
  const entry = standingsQuery.data.standings.find((row) => row.clubCode === clubCode);
  const basic = entry?.basic;
  if (!basic || !basic.gamesPlayed) {
    return <p role="status" className="muted">Team KPIs not available yet for this phase.</p>;
  }
  const gp = basic.gamesPlayed;
  const perGame = (total) => (total != null ? (total / gp).toFixed(1) : "-");

  return (
    <div className="kpi-strip">
      <div className="kpi-chip">
        <span className="value">{perGame(basic.pointsFor)}</span>
        <span className="label">Points for/game</span>
      </div>
      <div className="kpi-chip">
        <span className="value">{perGame(basic.pointsAgainst)}</span>
        <span className="label">Points against/game</span>
      </div>
      <div className="kpi-chip">
        <span className="value">{perGame(basic.pointsDifference)}</span>
        <span className="label">Point diff/game</span>
      </div>
      <div className="kpi-chip">
        <span className="value">{basic.winPercentage ?? "-"}</span>
        <span className="label">Win %</span>
      </div>
      <div className="kpi-chip">
        <span className="value">{gp}</span>
        <span className="label">Games played</span>
      </div>
    </div>
  );
}

function RecentFormList({ games, clubCode }) {
  const recent = games
    .filter((game) => game.played)
    .slice()
    .reverse()
    .slice(0, 5);

  return (
    <section className="panel p-4">
      <h2 className="panel-title mb-3">Recent form</h2>
      {recent.length === 0 ? (
        <p role="status" className="muted">No played games yet.</p>
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
    </section>
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
    <section className="panel p-4">
      <h2 className="panel-title mb-3">Compare</h2>
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
    </section>
  );
}

function OverviewSection({ seasonCode, clubCode, standingsQuery, games }) {
  const nextGame = games.find((game) => !game.played) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <OverviewKpiStrip standingsQuery={standingsQuery} clubCode={clubCode} />
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

function SeasonRecordSection({ standingsQuery, clubCode }) {
  if (standingsQuery.isPending) return <CenteredSpinner />;
  if (standingsQuery.isError) {
    return <ErrorAlert message="Could not load the season record." onRetry={() => standingsQuery.refetch()} />;
  }
  const entry = standingsQuery.data.standings.find((row) => row.clubCode === clubCode);
  if (!entry || !entry.basic) {
    return <p role="status" className="muted">Standings not available yet for this phase.</p>;
  }
  const basic = entry.basic;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      <div>
        <dt className="muted text-sm">Position</dt>
        <dd className="font-semibold">{basic.position ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Record</dt>
        <dd className="font-semibold">
          {basic.gamesWon ?? "-"}-{basic.gamesLost ?? "-"} ({basic.gamesPlayed ?? "-"} GP)
        </dd>
      </div>
      <div>
        <dt className="muted text-sm">Win %</dt>
        <dd className="font-semibold">{basic.winPercentage ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Points for/against</dt>
        <dd className="font-semibold">
          {basic.pointsFor ?? "-"} / {basic.pointsAgainst ?? "-"}
        </dd>
      </div>
      <div>
        <dt className="muted text-sm">Differential</dt>
        <dd className="font-semibold">{basic.pointsDifference ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Home record</dt>
        <dd className="font-semibold">{basic.homeRecord ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Away record</dt>
        <dd className="font-semibold">{basic.awayRecord ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Last 10</dt>
        <dd className="font-semibold">{basic.lastTenRecord ?? "-"}</dd>
      </div>
    </dl>
  );
}

function TeamStatisticsSection({ standingsQuery, clubCode }) {
  if (standingsQuery.isPending) return <CenteredSpinner />;
  if (standingsQuery.isError) {
    return <ErrorAlert message="Could not load team statistics." onRetry={() => standingsQuery.refetch()} />;
  }
  const entry = standingsQuery.data.standings.find((row) => row.clubCode === clubCode);
  const margins = entry?.margins;
  if (!margins) {
    return <p role="status" className="muted">Team statistics not available yet for this phase.</p>;
  }
  const rows = [
    ["Decided by 1-5 pts", margins.pointDifference1To5],
    ["Decided by 6-10 pts", margins.pointDifference6To10],
    ["Decided by 11-15 pts", margins.pointDifference11To15],
    ["Decided by 15+ pts", margins.pointDifferenceMoreThan15],
    ["Rebounds", margins.rebounds],
    ["Assists", margins.assists],
    ["Blocks", margins.blocks],
    ["Two-pointers", margins.twoPointers],
    ["Three-pointers", margins.threePointers],
    ["Free throws", margins.freeThrows],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="muted text-sm">{label}</dt>
          <dd className="font-semibold">{value ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatsSection({ standingsQuery, clubCode }) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Season record</h2>
        <SeasonRecordSection standingsQuery={standingsQuery} clubCode={clubCode} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Team statistics</h2>
        <TeamStatisticsSection standingsQuery={standingsQuery} clubCode={clubCode} />
      </section>
    </div>
  );
}

function RosterSection({ rosterQuery, rosterStatsQuery, seasonCode }) {
  if (rosterQuery.isPending) return <CenteredSpinner />;
  if (rosterQuery.isError) {
    return <ErrorAlert message="Could not load the roster." onRetry={() => rosterQuery.refetch()} />;
  }
  const registrations = rosterQuery.data.registrations ?? [];
  if (registrations.length === 0) {
    return <p role="status" className="muted">Roster not available yet.</p>;
  }
  if (rosterStatsQuery.isPending) return <CenteredSpinner />;
  if (rosterStatsQuery.isError) {
    return <ErrorAlert message="Could not load roster statistics." onRetry={() => rosterStatsQuery.refetch()} />;
  }

  const statsByPersonKey = rosterStatsQuery.data ?? new Map();
  const barScale = barWidthScale(
    registrations.map((entry) =>
      statNumber(statsByPersonKey.get(entry.player?.personKey)?.traditional?.pointsScored),
    ),
  );

  return (
    <div className="panel overflow-x-auto overscroll-x-contain p-2">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Position</th>
            <th>Status</th>
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
            return (
              <tr key={entry.registrationKey}>
                <td>{entry.dorsal ?? "-"}</td>
                <td className="font-medium">
                  {entry.player ? (
                    <Link
                      to={`/${seasonCode}/players/${entry.player.personKey}`}
                      className="link link-hover block max-w-40 truncate sm:max-w-56"
                      title={entry.player.name ?? "TBD"}
                    >
                      {entry.player.name ?? "TBD"}
                    </Link>
                  ) : (
                    "TBD"
                  )}
                </td>
                <td>{entry.positionName ?? "-"}</td>
                <td>{entry.active === false ? "Inactive" : "Active"}</td>
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
    </div>
  );
}

function ScheduleSection({ gamesQuery, clubCode }) {
  if (gamesQuery.isPending) return <CenteredSpinner />;
  if (gamesQuery.isError) {
    return <ErrorAlert message="Could not load the schedule." onRetry={() => gamesQuery.refetch()} />;
  }
  const games = gamesQuery.data.games ?? [];
  if (games.length === 0) {
    return <p role="status" className="muted">No games scheduled yet.</p>;
  }
  return (
    <div className="panel p-4">
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
    </div>
  );
}

const SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "roster", label: "Roster" },
  { key: "schedule", label: "Schedule" },
  { key: "stats", label: "Stats" },
];

export default function TeamPage() {
  const { seasonCode, clubCode } = useParams();
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [section, setSection] = useState("overview");

  const teamQuery = useQuery({
    queryKey: ["team", seasonCode, clubCode],
    queryFn: () => getTeam(seasonCode, clubCode),
    retry: false,
  });

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
    enabled: teamQuery.isSuccess,
  });
  const phases = phasesQuery.data?.phases ?? [];
  const phaseCode = selectedPhase ?? phases.find((phase) => phase.code === "RS")?.code ?? phases[0]?.code;

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
    enabled: teamQuery.isSuccess && Boolean(phaseCode) && section === "roster",
  });

  const gamesQuery = useQuery({
    queryKey: ["team-games", seasonCode, clubCode],
    queryFn: () => getTeamGames(seasonCode, clubCode, { limit: GAMES_LIMIT, order: "asc" }),
    enabled: teamQuery.isSuccess,
  });

  if (teamQuery.isLoading) return <CenteredSpinner />;

  if (teamQuery.isError) {
    const notFound = teamQuery.error?.response?.status === 404;
    return notFound ? (
      <p role="status" className="muted">Team not found.</p>
    ) : (
      <ErrorAlert message="Could not load this team." onRetry={() => teamQuery.refetch()} />
    );
  }

  const team = teamQuery.data.team;
  const games = gamesQuery.data?.games ?? [];
  const nextGame = games.find((game) => !game.played) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {team.crestUrl ? <img src={team.crestUrl} alt="" className="h-16 w-16 object-contain" /> : null}
        <div>
          <h1 className="text-2xl font-semibold">{team.name ?? team.abbreviatedName ?? team.clubCode}</h1>
          <p className="muted">
            {team.abbreviatedName ?? team.clubCode} · {team.countryCode ?? "-"}
          </p>
        </div>
        {gamesQuery.isSuccess ? <NextGameChip nextGame={nextGame} clubCode={clubCode} /> : null}
      </div>

      <div role="tablist" className="tabs tabs-boxed tabs-sm mb-4 w-fit">
        {phases.map((phase) => (
          <button
            key={phase.code}
            role="tab"
            type="button"
            className={`tab font-semibold ${phaseCode === phase.code ? "tab-active" : ""}`}
            onClick={() => setSelectedPhase(phase.code)}
          >
            {phase.name ?? phase.code}
          </button>
        ))}
      </div>

      <div role="tablist" className="tabs tabs-boxed tabs-sm mb-6 w-fit">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            role="tab"
            type="button"
            className={`tab font-semibold ${section === s.key ? "tab-active" : ""}`}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "overview" ? (
        gamesQuery.isPending ? (
          <CenteredSpinner />
        ) : gamesQuery.isError ? (
          <ErrorAlert message="Could not load this team's games." onRetry={() => gamesQuery.refetch()} />
        ) : (
          <OverviewSection seasonCode={seasonCode} clubCode={clubCode} standingsQuery={standingsQuery} games={games} />
        )
      ) : section === "roster" ? (
        <RosterSection rosterQuery={rosterQuery} rosterStatsQuery={rosterStatsQuery} seasonCode={seasonCode} />
      ) : section === "schedule" ? (
        <ScheduleSection gamesQuery={gamesQuery} clubCode={clubCode} />
      ) : (
        <StatsSection standingsQuery={standingsQuery} clubCode={clubCode} />
      )}
    </div>
  );
}
