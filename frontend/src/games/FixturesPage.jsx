import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import { getPhases, getRounds, getSeasonGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import CompactFilterSelect from "../lib/CompactFilterSelect";
import EmptyText from "../lib/EmptyText";
import { formatDateTime } from "../lib/format";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import { TabPanel, TabStrip } from "../lib/TabStrip";

const PAGE_SIZE = 20;
const ALL_ROUND_LIMIT = 100;

const STATUS_FILTERS = [
  { label: "All", value: undefined },
  { label: "Played", value: "played" },
  { label: "Scheduled", value: "scheduled" },
];

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

export default function FixturesPage() {
  useDocumentTitle("Fixtures and results");
  const { seasonCode } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(undefined);
  const [offset, setOffset] = useState(0);

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode] = usePhaseParam(phases);

  const roundParam = searchParams.get("round");
  const selectedRound = roundParam ? Number(roundParam) : null;

  const roundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, phaseCode],
    queryFn: () => getRounds(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });
  const rounds = roundsQuery.data?.rounds ?? [];

  function handlePhaseChange(code) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (code) next.set("phase", code); else next.delete("phase");
      next.delete("round");
      return next;
    });
    setStatus(undefined);
    setOffset(0);
  }

  function handleRoundChange(event) {
    const value = event.target.value;
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (value === "") next.delete("round"); else next.set("round", value);
      return next;
    });
    setOffset(0);
  }

  function handleStatusChange(value) {
    setStatus(value);
    setOffset(0);
  }

  const gamesParams = selectedRound
    ? { phase: phaseCode, round: selectedRound, status, limit: ALL_ROUND_LIMIT, order: "asc" }
    : { phase: phaseCode, status, limit: PAGE_SIZE, offset, order: "asc" };

  const gamesQuery = useQuery({
    queryKey: ["fixtures", seasonCode, phaseCode, selectedRound, status, offset],
    queryFn: () => getSeasonGames(seasonCode, gamesParams),
    enabled: Boolean(phaseCode),
  });

  const games = gamesQuery.data?.games ?? [];

  if (phasesQuery.isLoading) return <AsyncState status="loading" label="Loading phases" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader kicker="SCHEDULE" title="Fixtures and results" />

      <TabStrip
        ariaLabel="Phase"
        panelId="fixtures-panel"
        activeKey={phaseCode}
        onChange={handlePhaseChange}
        className="mb-4 w-fit"
        tabs={phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <CompactFilterSelect
          label="Round"
          value={selectedRound ?? ""}
          onChange={handleRoundChange}
          disabled={roundsQuery.isLoading}
        >
          <option value="">All rounds</option>
          {rounds.map((round) => (
            <option key={round.key} value={round.number}>
              {round.name ?? `Round ${round.number}`}
            </option>
          ))}
        </CompactFilterSelect>

        <TabStrip
          ariaLabel="Status"
          panelId="fixtures-panel"
          activeKey={status ?? "all"}
          onChange={(key) => handleStatusChange(key === "all" ? undefined : key)}
          className="w-fit"
          tabs={STATUS_FILTERS.map((filter) => ({ key: filter.value ?? "all", label: filter.label }))}
        />
      </div>

      <TabPanel id="fixtures-panel" focusKey={`${phaseCode}-${status}-${selectedRound}`}>
      {gamesQuery.isLoading ? (
        <AsyncState status="loading" label="Loading games" />
      ) : gamesQuery.isError ? (
        <AsyncState status="error" message="Could not load games." onRetry={() => gamesQuery.refetch()} />
      ) : games.length === 0 ? (
        <EmptyText>No games match these filters. Try a different round or status.</EmptyText>
      ) : (
        <>
          <p className="muted mb-2 text-sm">
            Showing {offset + 1}-{offset + games.length} of {gamesQuery.data?.pagination.total} games
          </p>
          <Panel className="p-4">
            <ul>
              {games.map((game) => {
                const localWon = game.played && game.localScore != null && game.roadScore != null && game.localScore > game.roadScore;
                const roadWon = game.played && game.localScore != null && game.roadScore != null && game.roadScore > game.localScore;
                return (
                  <li key={game.gameCode} className="border-b border-base-300 py-2 last:border-0">
                    <Link
                      to={`/${seasonCode}/games/${game.gameCode}`}
                      className="flex items-center justify-between gap-4 rounded-field hover:text-primary"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2">
                          <span className={`flex items-center gap-2 ${localWon ? "font-semibold" : ""}`}>
                            {game.localTeam?.crestUrl ? (
                              <img
                                src={game.localTeam.crestUrl}
                                alt=""
                                className="h-6 w-6 flex-none object-contain"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : null}
                            {teamLabel(game.localTeam)}
                          </span>
                          <span className="muted text-xs">vs</span>
                          <span className={`flex items-center gap-2 ${roadWon ? "font-semibold" : ""}`}>
                            {game.roadTeam?.crestUrl ? (
                              <img
                                src={game.roadTeam.crestUrl}
                                alt=""
                                className="h-6 w-6 flex-none object-contain"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : null}
                            {teamLabel(game.roadTeam)}
                          </span>
                        </span>
                        <span className="muted text-sm">
                          {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : "")} · {formatDateTime(game.scheduledAt)}
                        </span>
                      </div>
                      {game.played ? (
                        <span className="stat-badge stat-badge-neutral tabular-nums">
                          {game.localScore ?? "-"}-{game.roadScore ?? "-"}
                        </span>
                      ) : (
                        <span className="muted text-sm">Not yet played</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {!selectedRound ? (
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                className="btn btn-sm"
                disabled={offset === 0}
                onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
              >
                Previous page
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!gamesQuery.data?.pagination.hasMore}
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
              >
                Next page
              </button>
            </div>
          ) : null}
        </>
      )}
      </TabPanel>
    </div>
  );
}
