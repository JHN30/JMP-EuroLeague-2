import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import {
  getLeaderStats,
  getPhases,
  getPlayer,
  getPlayerGames,
  getPlayerRegistrations,
  getPlayerSeasonStats,
  getSeasons,
} from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDateTime, formatMinutes } from "../lib/format";
import InfoRow from "../lib/InfoRow";
import InfoTile from "../lib/InfoTile";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import PanelHeader from "../lib/PanelHeader";
import SeasonShootingChart from "../lib/SeasonShootingChart";
import { formatStatValue } from "../lib/statsFields";
import SummaryGrid from "../lib/SummaryGrid";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import PlayerAdvancedSection from "./PlayerAdvancedSection";

const GAMES_LIMIT = 100;
const LEADERBOARD_PAGE_LIMIT = 100;
const LEADERBOARD_MAX_PAGES = 5;

const RANKING_CATEGORIES = [
  { key: "scoring", label: "Scoring", group: "traditional", field: "pointsScored" },
  { key: "valuation", label: "Valuation", group: "traditional", field: "pir" },
  { key: "rebounding", label: "Rebounding", group: "traditional", field: "totalRebounds" },
  { key: "playmaking", label: "Playmaking", group: "traditional", field: "assists" },
  { key: "steals", label: "Steals", group: "traditional", field: "steals" },
  { key: "shooting", label: "Shooting", group: "advanced", field: "trueShootingPercentage" },
];

async function fetchLeagueLeaderboard(seasonCode, phaseCode) {
  const players = [];
  let offset = 0;
  for (let page = 0; page < LEADERBOARD_MAX_PAGES; page += 1) {
    const data = await getLeaderStats(seasonCode, {
      phase: phaseCode,
      mode: "perGame",
      limit: LEADERBOARD_PAGE_LIMIT,
      offset,
    });
    players.push(...data.players);
    if (!data.pagination.hasMore) break;
    offset += LEADERBOARD_PAGE_LIMIT;
  }
  return players;
}

async function fetchSeasonStory(seasons, personKey) {
  const cards = await Promise.all(
    seasons.map(async (season) => {
      try {
        const { player } = await getPlayer(season.seasonCode, personKey);
        const [registrationsData, statsData] = await Promise.all([
          getPlayerRegistrations(season.seasonCode, personKey),
          getPlayerSeasonStats(season.seasonCode, personKey, { mode: "perGame" }),
        ]);
        return {
          seasonCode: season.seasonCode,
          seasonName: season.name ?? season.seasonCode,
          player,
          registrations: registrationsData.registrations ?? [],
          stats: statsData.players?.[0]?.traditional ?? null,
        };
      } catch (error) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    }),
  );
  return cards.filter(Boolean);
}

function statNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function computeRankings(players, personKey) {
  return RANKING_CATEGORIES.map((category) => {
    const ranked = players
      .map((player) => ({ player, value: statNumber(player[category.group]?.[category.field]) }))
      .filter((row) => row.value !== null)
      .sort((a, b) => b.value - a.value);
    const total = ranked.length;
    const index = ranked.findIndex((row) => row.player.personKey === personKey);
    if (index === -1) return { ...category, value: null, rank: null, total, percentile: null };
    const rank = index + 1;
    const percentile = total > 1 ? Math.round(((total - rank) / (total - 1)) * 100) : 100;
    return { ...category, value: ranked[index].value, rank, total, percentile };
  });
}

const STATS_MODES = [
  { label: "Accumulated", value: "accumulated" },
  { label: "Per game", value: "perGame" },
];

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

function opponent(game, side) {
  return side === "local" ? game.roadTeam : game.localTeam;
}

function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

function RankingCard({ category }) {
  const { label, value, rank, total, percentile, field } = category;
  if (rank === null) {
    return (
      <Panel className="p-3">
        <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
        <p className="muted mt-1 text-sm">No recorded stats yet.</p>
      </Panel>
    );
  }
  return (
    <Panel className="p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
        <span className="badge badge-primary badge-outline badge-sm">#{rank}</span>
      </div>
      <span className="block text-lg font-semibold tabular-nums">{formatStatValue(field, value)}</span>
      <progress className="progress progress-primary mt-2 w-full" value={percentile} max="100" />
      <p className="muted mt-1 text-xs">{ordinal(rank)} of {total} players with recorded stats</p>
    </Panel>
  );
}

function useActiveTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function themeColor(el, variable) {
  return getComputedStyle(el).getPropertyValue(variable).trim();
}

function PercentileRadar({ rankings }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const hasData = rankings.some((category) => category.percentile !== null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasData) return undefined;

    const primary = themeColor(canvas, "--color-primary");
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;

    chartRef.current = new Chart(canvas, {
      type: "radar",
      data: {
        labels: rankings.map((category) => category.label),
        datasets: [
          {
            label: "Percentile",
            data: rankings.map((category) => category.percentile ?? 0),
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
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed.r}th percentile`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [rankings, theme, hasData]);

  return (
    <Panel className="p-4">
      <PanelHeader kicker="PERCENTILE 0-100" title="Percentile radar" />
      {!hasData ? (
        <p className="muted text-sm">Not enough recorded stats yet to chart percentiles.</p>
      ) : (
        <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
          <div className="relative h-72 w-full">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Percentile radar across ${rankings.map((c) => c.label).join(", ")}`}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}

function OverviewSection({ leaderboardQuery, personKey }) {
  if (leaderboardQuery.isPending) return <AsyncState status="loading" label="Loading league rankings" />;
  if (leaderboardQuery.isError) {
    return (
      <AsyncState status="error" message="Could not load league rankings." onRetry={() => leaderboardQuery.refetch()} />
    );
  }
  const rankings = computeRankings(leaderboardQuery.data, personKey);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rankings.map((category) => (
          <RankingCard key={category.key} category={category} />
        ))}
      </div>
      <PercentileRadar rankings={rankings} />
    </div>
  );
}

function SeasonStorySection({ seasonStoryQuery }) {
  if (seasonStoryQuery.isPending) return <AsyncState status="loading" label="Loading season history" />;
  if (seasonStoryQuery.isError) {
    return (
      <AsyncState status="error" message="Could not load season history." onRetry={() => seasonStoryQuery.refetch()} />
    );
  }
  const cards = seasonStoryQuery.data ?? [];
  if (cards.length === 0) {
    return <EmptyText>No archived seasons found for this player.</EmptyText>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <Panel key={card.seasonCode} className="p-4">
          <PanelHeader kicker={card.seasonCode} title={card.seasonName} />
          <div className="mb-3 flex flex-col gap-1">
            {card.registrations.length === 0 ? (
              <span className="muted text-sm">No team registration recorded.</span>
            ) : (
              card.registrations.map((entry) => (
                <Link
                  key={entry.registrationKey}
                  to={`/${card.seasonCode}/teams/${entry.team?.clubCode ?? entry.clubCode}`}
                  className="link link-hover text-sm font-semibold"
                >
                  {entry.team?.name ?? entry.clubCode}
                </Link>
              ))
            )}
          </div>
          {card.stats ? (
            <SummaryGrid>
              <InfoTile label="GP" value={formatStatValue("gamesPlayed", card.stats.gamesPlayed)} />
              <InfoTile label="PTS" value={formatStatValue("pointsScored", card.stats.pointsScored)} />
              <InfoTile label="REB" value={formatStatValue("totalRebounds", card.stats.totalRebounds)} />
              <InfoTile label="PIR" value={formatStatValue("pir", card.stats.pir)} />
            </SummaryGrid>
          ) : (
            <span className="muted text-sm">No recorded stats for this season.</span>
          )}
        </Panel>
      ))}
    </div>
  );
}

function RegistrationsSection({ registrationsQuery, seasonCode }) {
  if (registrationsQuery.isPending) return <AsyncState status="loading" label="Loading team registration" />;
  if (registrationsQuery.isError) {
    return <AsyncState status="error" message="Could not load team registration." onRetry={() => registrationsQuery.refetch()} />;
  }
  const registrations = registrationsQuery.data.registrations ?? [];
  if (registrations.length === 0) {
    return <EmptyText>No team registration found for this season.</EmptyText>;
  }
  const activeCount = registrations.filter((entry) => entry.active !== false).length;
  const heading = activeCount === 1 && registrations.length === 1 ? "Current team" : "Teams this season";

  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">{heading}</h2>
      <ul className="space-y-2">
        {registrations.map((entry) => (
          <InfoRow
            key={entry.registrationKey}
            primary={entry.team ? (
                <Link to={`/${seasonCode}/teams/${entry.team.clubCode}`} className="link link-hover">
                  {entry.team.name ?? entry.team.clubCode}
                </Link>
              ) : (
                <span>Unknown team</span>
              )}
            secondary={<>{entry.positionName ?? "-"} · #{entry.dorsal ?? "-"}</>}
            trailing={
              <span className={`badge badge-sm ${entry.active === false ? "badge-ghost" : "badge-primary"}`}>
                {entry.active === false ? "Inactive" : "Active"}
              </span>
            }
          />
        ))}
      </ul>
    </div>
  );
}

function StatSection({ title, fields, stats }) {
  if (!stats) return null;
  return (
    <div className="mb-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <SummaryGrid>
        {fields.map(([key, label]) => (
          <InfoTile key={key} label={label} value={formatStatValue(key, stats[key])} />
        ))}
      </SummaryGrid>
    </div>
  );
}

const TRADITIONAL_FIELDS = [
  ["gamesPlayed", "GP"],
  ["minutesPlayed", "MIN"],
  ["pointsScored", "PTS"],
  ["totalRebounds", "REB"],
  ["assists", "AST"],
  ["steals", "STL"],
  ["turnovers", "TO"],
  ["blocks", "BLK"],
  ["pir", "PIR"],
];

const ADVANCED_FIELDS = [
  ["effectiveFieldGoalPercentage", "eFG%"],
  ["trueShootingPercentage", "TS%"],
  ["reboundsPercentage", "REB%"],
  ["assistsToTurnoversRatio", "AST/TO"],
  ["possessions", "POSS"],
];

const SCORING_FIELDS = [
  ["twoPointRate", "2PT rate"],
  ["threePointRate", "3PT rate"],
  ["pointsFromTwoPointersPercentage", "Pts from 2PT %"],
  ["pointsFromThreePointersPercentage", "Pts from 3PT %"],
  ["pointsFromFreeThrowsPercentage", "Pts from FT %"],
];

const MISC_FIELDS = [
  ["wins", "W"],
  ["losses", "L"],
  ["doubleDoubles", "DD"],
  ["tripleDoubles", "TD"],
];

function SeasonStatsSection({ statsQuery }) {
  if (statsQuery.isPending) return <AsyncState status="loading" label="Loading season statistics" />;
  if (statsQuery.isError) {
    return <AsyncState status="error" message="Could not load season statistics." onRetry={() => statsQuery.refetch()} />;
  }
  const entry = statsQuery.data.players?.[0];
  if (!entry) {
    return <EmptyText>Season statistics not available yet for this phase.</EmptyText>;
  }
  return (
    <div>
      <StatSection title="Traditional" fields={TRADITIONAL_FIELDS} stats={entry.traditional} />
      <StatSection title="Advanced" fields={ADVANCED_FIELDS} stats={entry.advanced} />
      <StatSection title="Scoring" fields={SCORING_FIELDS} stats={entry.scoring} />
      <StatSection title="Misc" fields={MISC_FIELDS} stats={entry.misc} />
    </div>
  );
}

function GameLogSection({ gamesQuery }) {
  if (gamesQuery.isPending) return <AsyncState status="loading" label="Loading the game log" />;
  if (gamesQuery.isError) {
    return <AsyncState status="error" message="Could not load the game log." onRetry={() => gamesQuery.refetch()} />;
  }
  const games = gamesQuery.data.games ?? [];
  if (games.length === 0) {
    return <EmptyText>No game log available yet.</EmptyText>;
  }
  return (
    <Panel className="overflow-x-auto overscroll-x-contain p-2">
      <table className="data-table-sticky table">
        <thead>
          <tr>
            <th>Opponent</th>
            <th>Round</th>
            <th>Date</th>
            <th>Min</th>
            <th>Pts</th>
            <th>Reb</th>
            <th>Ast</th>
            <th>Stl</th>
            <th>TO</th>
            <th>Val</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => {
            const opponentLabel = teamLabel(opponent(game, game.side));
            return (
              <tr key={game.gameCode}>
                <td className="font-medium">
                  <span className="block max-w-40 truncate sm:max-w-56" title={opponentLabel}>
                    {opponentLabel}
                  </span>
                </td>
                <td>{game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)}</td>
                <td>{formatDateTime(game.scheduledAt)}</td>
                <td>{formatMinutes(game.timePlayed)}</td>
                <td>{game.points ?? "-"}</td>
                <td>{game.totalRebounds ?? "-"}</td>
                <td>{game.assistances ?? "-"}</td>
                <td>{game.steals ?? "-"}</td>
                <td>{game.turnovers ?? "-"}</td>
                <td>{game.valuation ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

function PlayerShootingSection({ seasonCode, phaseCode, player, registrationsQuery, gamesQuery, personKey }) {
  const [presentation, setPresentation] = useState("heatmap");
  const [gameSegment, setGameSegment] = useState("all");
  const [result, setResult] = useState("all");

  if (registrationsQuery.isPending || gamesQuery.isPending) {
    return <AsyncState status="loading" label="Loading this player's shot locations" />;
  }
  if (registrationsQuery.isError || gamesQuery.isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load this player's shot locations."
        onRetry={() => {
          registrationsQuery.refetch();
          gamesQuery.refetch();
        }}
      />
    );
  }

  const registrations = registrationsQuery.data.registrations ?? [];
  const currentTeam = (registrations.find((entry) => entry.active !== false) ?? registrations[0])?.team ?? null;
  const games = gamesQuery.data?.games ?? [];
  const playedGames = games.filter((game) => game.phaseCode === phaseCode);

  return (
    <SeasonShootingChart
      seasonCode={seasonCode}
      playedGames={playedGames}
      ownerFilter={(shot) => shot.personCode === personKey}
      team={currentTeam}
      subjectLabel={player.name ?? player.jerseyName ?? "Player"}
      presentation={presentation}
      onPresentationChange={setPresentation}
      gameSegment={gameSegment}
      onGameSegmentChange={setGameSegment}
      result={result}
      onResultChange={setResult}
    />
  );
}

export default function PlayerPage() {
  const { seasonCode, personKey } = useParams();
  const [section, setSection] = useState("overview");
  const [mode, setMode] = useState("accumulated");

  const playerQuery = useQuery({
    queryKey: ["player", seasonCode, personKey],
    queryFn: () => getPlayer(seasonCode, personKey),
    retry: false,
  });
  const player = playerQuery.data?.player;
  useDocumentTitle(player ? (player.name ?? player.jerseyName ?? player.personKey) : "Players");

  const registrationsQuery = useQuery({
    queryKey: ["player-registrations", seasonCode, personKey],
    queryFn: () => getPlayerRegistrations(seasonCode, personKey),
    enabled: playerQuery.isSuccess,
  });

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
    enabled: playerQuery.isSuccess,
  });
  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode, setPhaseCode] = usePhaseParam(phases);

  // Changing the archive-level phase resets the view-level stats mode.
  function handlePhaseChange(code) {
    setPhaseCode(code);
    setMode("accumulated");
  }

  const statsQuery = useQuery({
    queryKey: ["player-season-stats", seasonCode, personKey, phaseCode, mode],
    queryFn: () => getPlayerSeasonStats(seasonCode, personKey, { phase: phaseCode, mode }),
    enabled: playerQuery.isSuccess && Boolean(phaseCode),
  });

  const gamesQuery = useQuery({
    queryKey: ["player-games", seasonCode, personKey],
    queryFn: () => getPlayerGames(seasonCode, personKey, { limit: GAMES_LIMIT }),
    enabled: playerQuery.isSuccess && (section === "games" || section === "shooting"),
  });

  const leaderboardQuery = useQuery({
    queryKey: ["league-leaderboard", seasonCode, phaseCode],
    queryFn: () => fetchLeagueLeaderboard(seasonCode, phaseCode),
    enabled: playerQuery.isSuccess && Boolean(phaseCode) && section === "overview",
  });

  const seasonsQuery = useQuery({
    queryKey: ["seasons"],
    queryFn: () => getSeasons(),
    enabled: playerQuery.isSuccess && section === "seasons",
  });

  const seasonStoryQuery = useQuery({
    queryKey: ["player-season-story", personKey, seasonsQuery.data?.seasons?.map((s) => s.seasonCode).join(",")],
    queryFn: () => fetchSeasonStory(seasonsQuery.data.seasons, personKey),
    enabled: playerQuery.isSuccess && section === "seasons" && Boolean(seasonsQuery.data?.seasons),
  });

  if (playerQuery.isLoading) return <AsyncState status="loading" label="Loading the player" />;

  if (playerQuery.isError) {
    const notFound = playerQuery.error?.response?.status === 404;
    return notFound ? (
      <EmptyText>Player not found.</EmptyText>
    ) : (
      <AsyncState status="error" message="Could not load this player." onRetry={() => playerQuery.refetch()} />
    );
  }

  const headshotUrl =
    leaderboardQuery.data?.find((entry) => entry.personKey === personKey)?.playerImageUrl ??
    gamesQuery.data?.games[0]?.headshotUrl;

  return (
    <div>
      <PageHeader
        kicker="PLAYER"
        title={player.name ?? player.jerseyName ?? player.personKey}
        media={
          headshotUrl ? (
            <img
              src={headshotUrl}
              alt=""
              className="aspect-3/4 h-16 w-auto flex-none object-contain object-bottom"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null
        }
        description={
          <p className="muted">
            {player.jerseyName ?? "-"} · {player.countryCode ?? "-"} · {player.heightCm ? `${player.heightCm} cm` : "-"}
          </p>
        }
      />

      <section className="mb-8">
        <RegistrationsSection registrationsQuery={registrationsQuery} seasonCode={seasonCode} />
      </section>

      <section className="mb-8">
        <TabStrip
          ariaLabel="Player detail section"
          panelId="player-detail-panel"
          activeKey={section}
          onChange={setSection}
          className="mb-4 w-fit"
          tabs={[
            { key: "overview", label: "Overview" },
            { key: "seasons", label: "Season by season" },
            { key: "statistics", label: "Statistics" },
            { key: "advanced", label: "Advanced" },
            { key: "shooting", label: "Shooting" },
            { key: "games", label: "Games" },
          ]}
        />
        <TabPanel id="player-detail-panel" focusKey={section}>
          {section === "overview" ? (
            <OverviewSection leaderboardQuery={leaderboardQuery} personKey={personKey} />
          ) : section === "seasons" ? (
            <SeasonStorySection seasonStoryQuery={seasonStoryQuery} />
          ) : section === "statistics" ? (
            <>
              <h2 className="mb-3 text-xl font-semibold">Season statistics</h2>
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <TabStrip
                  ariaLabel="Phase"
                  panelId="player-stats-panel"
                  activeKey={phaseCode}
                  onChange={handlePhaseChange}
                  className="w-fit"
                  tabs={phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
                />
                <TabStrip
                  ariaLabel="Stats mode"
                  panelId="player-stats-panel"
                  activeKey={mode}
                  onChange={setMode}
                  className="w-fit"
                  tabs={STATS_MODES.map((option) => ({ key: option.value, label: option.label }))}
                />
              </div>
              <TabPanel id="player-stats-panel" focusKey={`${phaseCode}-${mode}`}>
                <SeasonStatsSection statsQuery={statsQuery} />
              </TabPanel>
            </>
          ) : section === "advanced" ? (
            <PlayerAdvancedSection key={`${seasonCode}-${personKey}`} seasonCode={seasonCode} personKey={personKey} />
          ) : section === "shooting" ? (
            <PlayerShootingSection
              seasonCode={seasonCode}
              phaseCode={phaseCode}
              player={player}
              registrationsQuery={registrationsQuery}
              gamesQuery={gamesQuery}
              personKey={personKey}
            />
          ) : (
            <>
              <h2 className="mb-3 text-xl font-semibold">Game-by-game performance</h2>
              <GameLogSection gamesQuery={gamesQuery} />
            </>
          )}
        </TabPanel>
      </section>
    </div>
  );
}
