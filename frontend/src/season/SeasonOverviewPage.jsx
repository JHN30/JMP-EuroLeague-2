import { useQueries, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getCoverage, getPhases, getSeasonGames, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import DataCoveragePanel from "../lib/DataCoveragePanel";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import {
  formatCount,
  formatDateTime,
  formatPerGame,
  formatSeasonLabel,
} from "../lib/format";

const PHASE_ORDER = ["RS", "PI", "PO", "FF"];
const MAX_PAGE_SIZE = 100;
const MAX_PAGES = 10;

function phaseSortIndex(code) {
  const index = PHASE_ORDER.indexOf(code);
  return index === -1 ? PHASE_ORDER.length : index;
}

function isFinalGame(game) {
  const label = `${game.groupName ?? ""} ${game.roundName ?? ""}`.toLowerCase();
  if (label.includes("championship")) return true;
  // "semifinal" contains the substring "final", so it must be excluded
  // explicitly before falling back to the plain "final" match.
  if (label.includes("semifinal") || label.includes("semi-final") || label.includes("semi final")) return false;
  if (label.includes("3rd") || label.includes("third")) return false;
  return label.includes("final");
}

function findChampion(finalFourGames) {
  const finalGame = finalFourGames.find((game) => game.played && isFinalGame(game));
  if (!finalGame || finalGame.localScore == null || finalGame.roadScore == null) return null;
  if (finalGame.localScore === finalGame.roadScore) return null;
  return finalGame.localScore > finalGame.roadScore ? finalGame.localTeam : finalGame.roadTeam;
}

function currentPhaseFromPlayedGames(phases, playedGames) {
  const phasesWithPlayedGames = new Set(playedGames.map((game) => game.phaseCode));
  const mostAdvanced = [...phases]
    .filter((phase) => phasesWithPlayedGames.has(phase.code))
    .sort((a, b) => phaseSortIndex(b.code) - phaseSortIndex(a.code));
  if (mostAdvanced.length > 0) return mostAdvanced[0];
  return phases.find((phase) => phase.code === "RS") ?? phases[0];
}

// The season API caps `limit` at 100, so a full season's played games (which
// can exceed that) are paged through rather than fetched in one request.
async function fetchAllPlayedGames(seasonCode) {
  const all = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { games, pagination } = await getSeasonGames(seasonCode, {
      status: "played",
      limit: MAX_PAGE_SIZE,
      offset,
      order: "asc",
    });
    all.push(...games);
    if (!pagination.hasMore) break;
    offset += MAX_PAGE_SIZE;
  }
  return all;
}

function teamCountFromGames(games) {
  const codes = new Set();
  for (const game of games) {
    if (game.localTeam?.clubCode) codes.add(game.localTeam.clubCode);
    if (game.roadTeam?.clubCode) codes.add(game.roadTeam.clubCode);
  }
  return codes.size;
}

function dateRangeLabel(firstDate, lastDate) {
  if (!firstDate) return null;
  const start = formatDateTime(firstDate, { dateStyle: "medium" });
  const end = lastDate ? formatDateTime(lastDate, { dateStyle: "medium" }) : start;
  return start === end ? start : `${start} - ${end}`;
}

function SeasonHero({ champion, phaseName, hasPlayedGames }) {
  if (champion) {
    return (
      <Panel className="flex items-center gap-4 border-success bg-success/10 p-4">
        {champion.crestUrl ? (
          <img
            src={champion.crestUrl}
            alt=""
            className="h-16 w-16 flex-none object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <div>
          <p className="text-success text-xs font-bold uppercase tracking-wide">Season champion</p>
          <p className="text-xl font-semibold">{champion.name ?? champion.abbreviatedName ?? champion.clubCode}</p>
        </div>
      </Panel>
    );
  }
  return (
    <Panel className="flex items-center gap-3 p-4">
      <span className="text-2xl" aria-hidden="true">◇</span>
      <p className="text-lg font-semibold">
        {hasPlayedGames ? `${phaseName} in progress` : "Season not yet started"}
      </p>
    </Panel>
  );
}

function SummaryCards({ totalGames, playedGames, phases, currentPhaseCode }) {
  const withScores = playedGames.filter((game) => game.localScore != null && game.roadScore != null);
  const combinedScores = withScores.map((game) => game.localScore + game.roadScore);
  const margins = withScores.map((game) => Math.abs(game.localScore - game.roadScore));
  const avg = (values) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);

  const cards = [
    { label: "Games", value: formatCount(totalGames) },
    { label: "Scoring level", value: withScores.length === 0 ? "—" : `${formatPerGame(avg(combinedScores))} pts/game` },
    { label: "Average margin of victory", value: withScores.length === 0 ? "—" : `${formatPerGame(avg(margins))} pts` },
    { label: "Competition path", highlight: currentPhaseCode },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Panel key={card.label} className="p-4">
          <p className="eyebrow mb-1">{card.label}</p>
          {card.highlight ? (
            <p className="text-sm font-medium">
              {phases.map((phase, index) => (
                <span key={phase.code} className={phase.code === card.highlight ? "text-primary font-semibold" : ""}>
                  {phase.name ?? phase.code}
                  {index < phases.length - 1 ? " → " : ""}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-2xl font-semibold">{card.value}</p>
          )}
        </Panel>
      ))}
    </div>
  );
}

function PhaseStory({ phases, phaseSummaries }) {
  return (
    <div>
      <PanelHeader kicker="TIMELINE" title="Phase story" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {phases.map((phase, index) => {
          const summary = phaseSummaries[phase.code];
          return (
            <div key={phase.code} className="flex items-center gap-2">
              <Panel className="relative flex-1 overflow-hidden p-4">
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary" />
                <p className="eyebrow mb-1">Phase {index + 1}</p>
                <h3 className="mb-2 font-semibold">{phase.name ?? phase.code}</h3>
                {!summary || summary.gameCount === 0 ? (
                  <p className="muted text-sm">Not yet applicable</p>
                ) : (
                  <>
                    <p className="muted text-sm">{formatCount(summary.gameCount)} games · {formatCount(summary.teamCount)} teams</p>
                    {summary.dateRange ? <p className="muted text-xs">{summary.dateRange}</p> : null}
                  </>
                )}
              </Panel>
              {index < phases.length - 1 ? (
                <span className="muted hidden text-lg xl:inline" aria-hidden="true">→</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SeasonOverviewPage() {
  const { seasonCode } = useParams();
  useDocumentTitle(`${formatSeasonLabel(seasonCode)} season overview`);

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];

  // First game of each phase (ascending) gives the phase's game count and
  // start date in one request; a second, descending request gives the end
  // date. Regular Season's team count comes from its standings (every
  // registered team appears there); the knockout phases (Play-In, Playoffs,
  // Final Four) have no standings concept, so their team count is derived
  // from the phase's own games instead, fetched in one request each since
  // a knockout bracket never approaches the API's page-size cap.
  const phaseFirstGameQueries = useQueries({
    queries: phases.map((phase) => ({
      queryKey: ["overview-phase-first-game", seasonCode, phase.code],
      queryFn: () => getSeasonGames(seasonCode, { phase: phase.code, limit: 1, order: "asc" }),
    })),
  });
  const phaseLastGameQueries = useQueries({
    queries: phases.map((phase) => ({
      queryKey: ["overview-phase-last-game", seasonCode, phase.code],
      queryFn: () => getSeasonGames(seasonCode, { phase: phase.code, limit: 1, order: "desc" }),
    })),
  });
  // Regular Season's roster is every registered team, regardless of how
  // many rounds have been played; standings entries only materialize once
  // games are played, so they would under-report a not-yet-started season.
  const seasonTeamsQuery = useQuery({
    queryKey: ["teams", seasonCode],
    queryFn: () => getSeasonTeams(seasonCode),
  });
  const knockoutPhases = phases.filter((phase) => phase.code !== "RS");
  const knockoutPhaseGamesQueries = useQueries({
    queries: knockoutPhases.map((phase) => ({
      queryKey: ["overview-phase-games", seasonCode, phase.code],
      queryFn: () => getSeasonGames(seasonCode, { phase: phase.code, limit: MAX_PAGE_SIZE, order: "asc" }),
    })),
  });

  const totalGamesQuery = useQuery({
    queryKey: ["overview-games-total", seasonCode],
    queryFn: () => getSeasonGames(seasonCode, { limit: 1 }),
  });

  const playedGamesQuery = useQuery({
    queryKey: ["overview-played-games", seasonCode],
    queryFn: () => fetchAllPlayedGames(seasonCode),
  });

  const finalFourGamesQuery = useQuery({
    queryKey: ["overview-ff-games", seasonCode],
    queryFn: () => getSeasonGames(seasonCode, { phase: "FF", limit: MAX_PAGE_SIZE, order: "asc" }),
    enabled: phases.some((phase) => phase.code === "FF"),
  });

  const phaseSummaries = {};
  phases.forEach((phase, index) => {
    const first = phaseFirstGameQueries[index]?.data;
    const last = phaseLastGameQueries[index]?.data;
    const teamCount =
      phase.code === "RS"
        ? seasonTeamsQuery.data?.teams?.length ?? 0
        : teamCountFromGames(
            knockoutPhaseGamesQueries[knockoutPhases.findIndex((p) => p.code === phase.code)]?.data?.games ?? [],
          );
    phaseSummaries[phase.code] = {
      gameCount: first?.pagination.total ?? 0,
      teamCount,
      dateRange: dateRangeLabel(first?.games[0]?.scheduledAt, last?.games[0]?.scheduledAt),
    };
  });

  const playedGames = playedGamesQuery.data ?? [];
  const activePhase = phases.length > 0 ? currentPhaseFromPlayedGames(phases, playedGames) : null;
  const champion = findChampion(finalFourGamesQuery.data?.games ?? []);

  const coverageQuery = useQuery({
    queryKey: ["coverage", seasonCode],
    queryFn: () => getCoverage(seasonCode),
  });

  if (phasesQuery.isLoading) return <AsyncState status="loading" label="Loading phases" fullScreen />;
  if (phasesQuery.isError) {
    return (
      <AsyncState status="error" fullScreen message="Could not load this season." onRetry={() => phasesQuery.refetch()} />
    );
  }

  const summaryLoading =
    phaseFirstGameQueries.some((query) => query.isLoading) ||
    phaseLastGameQueries.some((query) => query.isLoading) ||
    knockoutPhaseGamesQueries.some((query) => query.isLoading) ||
    seasonTeamsQuery.isLoading ||
    totalGamesQuery.isLoading ||
    playedGamesQuery.isLoading ||
    finalFourGamesQuery.isLoading;
  const summaryError =
    phaseFirstGameQueries.some((query) => query.isError) ||
    phaseLastGameQueries.some((query) => query.isError) ||
    knockoutPhaseGamesQueries.some((query) => query.isError) ||
    seasonTeamsQuery.isError ||
    totalGamesQuery.isError ||
    playedGamesQuery.isError ||
    finalFourGamesQuery.isError;

  function retrySummary() {
    phaseFirstGameQueries.forEach((query) => query.refetch());
    phaseLastGameQueries.forEach((query) => query.refetch());
    knockoutPhaseGamesQueries.forEach((query) => query.refetch());
    seasonTeamsQuery.refetch();
    totalGamesQuery.refetch();
    playedGamesQuery.refetch();
    finalFourGamesQuery.refetch();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="RECAP" title={`EuroLeague ${formatSeasonLabel(seasonCode)}`} />

      {summaryLoading ? (
        <AsyncState status="loading" label="Loading season summary" />
      ) : summaryError ? (
        <AsyncState status="error" message="Could not load this season's summary." onRetry={retrySummary} />
      ) : (
        <>
          <SeasonHero
            champion={champion}
            phaseName={activePhase?.name ?? activePhase?.code ?? "Season"}
            hasPlayedGames={playedGames.length > 0}
          />
          <SummaryCards
            totalGames={totalGamesQuery.data?.pagination.total}
            playedGames={playedGames}
            phases={phases}
            currentPhaseCode={activePhase?.code}
          />
          <PhaseStory phases={phases} phaseSummaries={phaseSummaries} />
        </>
      )}

      {coverageQuery.isLoading ? (
        <AsyncState status="loading" label="Loading season data coverage" compact />
      ) : coverageQuery.isError ? (
        <AsyncState status="error" inline message="Could not load this season's data coverage." />
      ) : (
        <DataCoveragePanel coverage={coverageQuery.data} title="Season data coverage" full />
      )}
    </div>
  );
}
