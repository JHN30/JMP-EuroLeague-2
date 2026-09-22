import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getPhases, getSeasonGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDateTime } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import { TabPanel, TabStrip } from "../lib/TabStrip";

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

function MatchupCard({ seasonCode, groupName, games }) {
  const sorted = [...games].sort((a, b) => (a.roundNumber ?? Infinity) - (b.roundNumber ?? Infinity));

  return (
    <Panel className="p-4">
      <PanelHeader kicker="BRACKET" title={groupName} />
      <ul>
        {sorted.map((game) => {
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
                    <span className={localWon ? "font-semibold" : undefined}>{teamLabel(game.localTeam)}</span>
                    <span className="muted text-xs">vs</span>
                    <span className={roadWon ? "font-semibold" : undefined}>{teamLabel(game.roadTeam)}</span>
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
  );
}

function MatchupGroups({ seasonCode, games }) {
  if (games.length === 0) {
    return <EmptyText>No games scheduled yet for this phase.</EmptyText>;
  }

  const groups = new Map();
  for (const game of games) {
    const key = game.groupId ?? game.groupName ?? "ungrouped";
    if (!groups.has(key)) groups.set(key, { groupName: game.groupName ?? "Matchup", games: [] });
    groups.get(key).games.push(game);
  }

  const sortedGroups = [...groups.entries()].sort(
    ([, a], [, b]) =>
      Math.min(...a.games.map((game) => game.roundNumber ?? Infinity)) -
      Math.min(...b.games.map((game) => game.roundNumber ?? Infinity)),
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sortedGroups.map(([key, group]) => (
        <MatchupCard key={key} seasonCode={seasonCode} groupName={group.groupName} games={group.games} />
      ))}
    </div>
  );
}

export default function PlayoffsPage() {
  useDocumentTitle("Playoffs");
  const { seasonCode } = useParams();

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const postseasonPhases = (phasesQuery.data?.phases ?? []).filter((phase) => phase.code !== "RS");
  const [phaseCode, setPhaseCode] = usePhaseParam(postseasonPhases);

  const gamesQuery = useQuery({
    queryKey: ["playoff-games", seasonCode, phaseCode],
    queryFn: () => getSeasonGames(seasonCode, { phase: phaseCode, limit: 100 }),
    enabled: Boolean(phaseCode),
  });

  if (phasesQuery.isLoading) return <AsyncState status="loading" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader kicker="POSTSEASON" title="Playoffs" />

      {postseasonPhases.length === 0 ? (
        <p className="muted">The postseason has not started yet for this season.</p>
      ) : (
        <>
          <TabStrip
            ariaLabel="Postseason phase"
            panelId="playoffs-panel"
            activeKey={phaseCode}
            onChange={setPhaseCode}
            className="mb-6 w-fit"
            tabs={postseasonPhases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
          />

          <TabPanel id="playoffs-panel" focusKey={phaseCode}>
            {gamesQuery.isPending ? (
              <AsyncState status="loading" />
            ) : gamesQuery.isError ? (
              <AsyncState status="error" message="Could not load games." onRetry={() => gamesQuery.refetch()} />
            ) : (
              <MatchupGroups seasonCode={seasonCode} games={gamesQuery.data.games} />
            )}
          </TabPanel>
        </>
      )}
    </div>
  );
}
