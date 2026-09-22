import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
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
import InfoRow from "../lib/InfoRow";
import InfoTile from "../lib/InfoTile";
import Panel from "../lib/Panel";
import { formatStatValue } from "../lib/statsFields";
import SummaryGrid from "../lib/SummaryGrid";
import { TabPanel, TabStrip } from "../lib/TabStrip";

const GAMES_LIMIT = 100;

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

function RegistrationsSection({ registrationsQuery, seasonCode }) {
  if (registrationsQuery.isPending) return <AsyncState status="loading" />;
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
              <span className={`badge badge-sm ${entry.active === false ? "badge-ghost" : "badge-success"}`}>
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
  if (statsQuery.isPending) return <AsyncState status="loading" />;
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
  if (gamesQuery.isPending) return <AsyncState status="loading" />;
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

export default function PlayerPage() {
  const { seasonCode, personKey } = useParams();
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [mode, setMode] = useState("accumulated");

  const playerQuery = useQuery({
    queryKey: ["player", seasonCode, personKey],
    queryFn: () => getPlayer(seasonCode, personKey),
    retry: false,
  });

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
  const phaseCode = selectedPhase ?? phases.find((phase) => phase.code === "RS")?.code ?? phases[0]?.code;

  const statsQuery = useQuery({
    queryKey: ["player-season-stats", seasonCode, personKey, phaseCode, mode],
    queryFn: () => getPlayerSeasonStats(seasonCode, personKey, { phase: phaseCode, mode }),
    enabled: playerQuery.isSuccess && Boolean(phaseCode),
  });

  const gamesQuery = useQuery({
    queryKey: ["player-games", seasonCode, personKey],
    queryFn: () => getPlayerGames(seasonCode, personKey, { limit: GAMES_LIMIT }),
    enabled: playerQuery.isSuccess,
  });

  if (playerQuery.isLoading) return <AsyncState status="loading" />;

  if (playerQuery.isError) {
    const notFound = playerQuery.error?.response?.status === 404;
    return notFound ? (
      <EmptyText>Player not found.</EmptyText>
    ) : (
      <AsyncState status="error" message="Could not load this player." onRetry={() => playerQuery.refetch()} />
    );
  }

  const player = playerQuery.data.player;
  const headshotUrl = gamesQuery.data?.games[0]?.headshotUrl;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {headshotUrl ? (
          <img
            src={headshotUrl}
            alt=""
            className="h-16 w-16 flex-none rounded-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold">{player.name ?? player.jerseyName ?? player.personKey}</h1>
          <p className="muted">
            {player.jerseyName ?? "-"} · {player.countryCode ?? "-"} · {player.heightCm ? `${player.heightCm} cm` : "-"}
          </p>
        </div>
      </div>

      <section className="mb-8">
        <RegistrationsSection registrationsQuery={registrationsQuery} seasonCode={seasonCode} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Season statistics</h2>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <TabStrip
            ariaLabel="Phase"
            panelId="player-stats-panel"
            activeKey={phaseCode}
            onChange={setSelectedPhase}
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
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Game-by-game performance</h2>
        <GameLogSection gamesQuery={gamesQuery} />
      </section>
    </div>
  );
}
