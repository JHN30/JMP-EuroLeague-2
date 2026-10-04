import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import {
  getPhases,
  getPlayer,
  getPlayerGames,
  getPlayerRegistrations,
  getPlayerSeasonStats,
} from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDateTime, formatMinutes } from "../lib/format";
import Panel from "../lib/Panel";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import PlayerAdvancedSection from "./PlayerAdvancedSection";
import PlayerCareerSection from "./PlayerCareerSection";
import PlayerHero from "./PlayerHero";
import PlayerOverviewSection from "./PlayerOverviewSection";
import PlayerShootingSection from "./PlayerShootingSection";
import PlayerStatisticsSection from "./PlayerStatisticsSection";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "./leagueLeaderboard";

const GAMES_LIMIT = 100;

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

function opponent(game, side) {
  return side === "local" ? game.roadTeam : game.localTeam;
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

// The Shooting tab waits for the game log (every shot list is read per game) and then hands over to the shared layout.
function PlayerShootingTab({ seasonCode, phaseCode, player, gamesQuery, personKey }) {
  if (gamesQuery.isPending) return <AsyncState status="loading" label="Loading this player's shot locations" />;
  if (gamesQuery.isError) {
    return <AsyncState status="error" message="Could not load this player's shot locations." onRetry={() => gamesQuery.refetch()} />;
  }
  return (
    <PlayerShootingSection
      key={`${seasonCode}-${personKey}-${phaseCode}`}
      seasonCode={seasonCode}
      phaseCode={phaseCode}
      player={player}
      games={gamesQuery.data?.games ?? []}
      personKey={personKey}
    />
  );
}

export default function PlayerPage() {
  const { seasonCode, personKey } = useParams();
  const [section, setSection] = useState("overview");

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

  const statsQuery = useQuery({
    // The header reads age, photo and record from the season totals; the Statistics tab runs its own queries.
    queryKey: ["player-season-stats", seasonCode, personKey, phaseCode, "accumulated"],
    queryFn: () => getPlayerSeasonStats(seasonCode, personKey, { phase: phaseCode, mode: "accumulated" }),
    enabled: playerQuery.isSuccess && Boolean(phaseCode),
  });

  const gamesQuery = useQuery({
    queryKey: ["player-games", seasonCode, personKey],
    queryFn: () => getPlayerGames(seasonCode, personKey, { limit: GAMES_LIMIT }),
    enabled: playerQuery.isSuccess && (section === "overview" || section === "games" || section === "shooting"),
  });

  const leaderboardQuery = useQuery({
    queryKey: leaderboardQueryKey(seasonCode, phaseCode),
    queryFn: () => fetchLeagueLeaderboard(seasonCode, phaseCode),
    enabled: playerQuery.isSuccess && Boolean(phaseCode) && section === "overview",
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

  return (
    <div>
      <PlayerHero
        player={player}
        registrations={registrationsQuery.data?.registrations}
        stats={statsQuery.data?.players?.[0]}
        seasonCode={seasonCode}
      />

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
        <TabPanel id="player-detail-panel" focusKey={section} scroll={false}>
          {section === "overview" ? (
            <PlayerOverviewSection leaderboardQuery={leaderboardQuery} gamesQuery={gamesQuery} personKey={personKey} seasonCode={seasonCode} />
          ) : section === "seasons" ? (
            <PlayerCareerSection personKey={personKey} seasonCode={seasonCode} />
          ) : section === "statistics" ? (
            <PlayerStatisticsSection
              key={`${seasonCode}-${personKey}`}
              seasonCode={seasonCode}
              personKey={personKey}
              phases={phases}
              phaseCode={phaseCode}
              onPhaseChange={setPhaseCode}
            />
          ) : section === "advanced" ? (
            <PlayerAdvancedSection key={`${seasonCode}-${personKey}`} seasonCode={seasonCode} personKey={personKey} />
          ) : section === "shooting" ? (
            <PlayerShootingTab seasonCode={seasonCode} phaseCode={phaseCode} player={player} gamesQuery={gamesQuery} personKey={personKey} />
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
