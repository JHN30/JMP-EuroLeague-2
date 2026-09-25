import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chart } from "chart.js/auto";
import { Link, useParams } from "react-router";
import { getPhases, getPostseasonSeries, getSeasonGames, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { formatCount, formatSignedDiff } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { thinAxisLabels } from "../lib/chartHelpers";
import { useActiveTheme, themeColor } from "../lib/useActiveTheme";
import { dateRangeLabel, phaseSortIndex, teamCountFromGames } from "../lib/phaseSummary";

const MAX_PAGE_SIZE = 100;
const MAX_PAGES = 10;

const STAGE_BLURBS = {
  PI: "Determines which teams join the Playoffs.",
  PO: "Best-of-five series to reach the Final Four.",
  FF: "Single games to reach the championship.",
  CHAMPIONSHIP: "One game decides the champion.",
};

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

// The season endpoint caps `limit` at 100, so a phase's full game list is
// paged through rather than fetched in one request (Regular Season can
// exceed 100 games).
async function fetchAllPhaseGames(seasonCode, phaseCode) {
  const all = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { games, pagination } = await getSeasonGames(seasonCode, {
      phase: phaseCode,
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

function PhaseProgressionRow({ phases, gamesByPhase }) {
  return (
    <div>
      <PanelHeader kicker="FORMAT" title="Phase progression" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {phases.map((phase, index) => {
          const games = gamesByPhase[phase.code] ?? [];
          const teamCount = teamCountFromGames(games);
          const dates = games.map((game) => game.scheduledAt).filter(Boolean).sort();
          const next = phases[index + 1];
          const nextTeamCount = next ? teamCountFromGames(gamesByPhase[next.code] ?? []) : null;

          return (
            <Panel key={phase.code} className="relative overflow-hidden p-4">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary" />
              <p className="eyebrow mb-1">Phase {index + 1}</p>
              <h3 className="mb-1 font-semibold">{phase.name ?? phase.code}</h3>
              <p className="muted mb-2 text-xs uppercase tracking-wide">{phase.code}</p>
              {games.length === 0 ? (
                <p className="muted text-sm">Not yet applicable</p>
              ) : (
                <>
                  <p className="muted text-sm">
                    {formatCount(teamCount)} teams · {formatCount(games.length)} games
                  </p>
                  {dateRangeLabel(dates[0], dates[dates.length - 1]) ? (
                    <p className="muted text-xs">{dateRangeLabel(dates[0], dates[dates.length - 1])}</p>
                  ) : null}
                  {next && nextTeamCount ? (
                    <p className="text-primary mt-2 text-xs font-medium">
                      {formatCount(nextTeamCount)} teams continue to {next.name ?? next.code}
                    </p>
                  ) : null}
                </>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function roundVolumeSeries(games) {
  const byRound = new Map();
  for (const game of games) {
    if (game.roundNumber == null) continue;
    if (!byRound.has(game.roundNumber)) byRound.set(game.roundNumber, { scheduled: 0, completed: 0 });
    const entry = byRound.get(game.roundNumber);
    entry.scheduled += 1;
    if (game.played) entry.completed += 1;
  }
  const rounds = [...byRound.entries()].sort(([a], [b]) => a - b);
  return {
    labels: rounds.map(([round]) => `R${round}`),
    scheduled: rounds.map(([, entry]) => entry.scheduled),
    completed: rounds.map(([, entry]) => entry.completed),
  };
}

function RoundVolumeChart({ games }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const { labels, scheduled, completed } = useMemo(() => roundVolumeSeries(games), [games]);
  const axisLabels = useMemo(() => thinAxisLabels(labels, 12), [labels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || labels.length === 0) return undefined;

    const primary = themeColor(canvas, "--color-primary");
    const base300 = themeColor(canvas, "--color-base-300");
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;

    chartRef.current = new Chart(canvas, {
      type: "bar",
      data: {
        labels: axisLabels,
        datasets: [
          { label: "Scheduled", data: scheduled, backgroundColor: base300 },
          { label: "Completed", data: completed, backgroundColor: primary },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: false, ticks: { color: textColor }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: textColor, precision: 0 }, grid: { color: gridColor } },
        },
        plugins: {
          legend: { labels: { color: textColor } },
          tooltip: { mode: "index", intersect: false },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [axisLabels, scheduled, completed, labels.length, theme]);

  if (labels.length === 0) {
    return <p className="muted text-sm">No rounds scheduled yet.</p>;
  }

  return (
    <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
      <div className="relative h-64 w-full">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Scheduled and completed games per round, ${completed.reduce((sum, value) => sum + value, 0)} of ${scheduled.reduce((sum, value) => sum + value, 0)} games completed`}
        />
      </div>
    </div>
  );
}

function RegularSeasonGroupCard({ groupName, entries, seasonCode }) {
  return (
    <Panel className="overflow-x-auto p-4">
      <PanelHeader kicker="GROUP" title={groupName} />
      <table className="table-compact table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>W-L</th>
            <th>Diff</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const diff = entry.basic?.pointsDifference;
            return (
              <tr key={entry.clubCode}>
                <td className="tabular-nums">{entry.basic?.position ?? "-"}</td>
                <td>
                  <Link to={`/${seasonCode}/teams/${entry.clubCode}`} className="link link-hover flex items-center gap-2">
                    {entry.crestUrl ? (
                      <img
                        src={entry.crestUrl}
                        alt=""
                        className="h-5 w-5 flex-none object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <span className="truncate">{entry.clubName ?? entry.clubCode}</span>
                  </Link>
                </td>
                <td className="tabular-nums">
                  {entry.basic?.gamesWon ?? "-"}-{entry.basic?.gamesLost ?? "-"}
                </td>
                <td className={`tabular-nums font-semibold ${diff > 0 ? "text-success" : diff < 0 ? "text-error" : ""}`}>
                  {formatSignedDiff(diff)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted mt-3 text-xs">
        Group records are calculated from archived results. Official tiebreakers may produce a different ordering.
      </p>
    </Panel>
  );
}

function RegularSeasonPanel({ seasonCode, games }) {
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });

  const groups = new Map();
  for (const entry of standingsQuery.data?.standings ?? []) {
    const key = entry.groupName ?? "Regular Season";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  return (
    <div>
      <PanelHeader kicker="REGULAR SEASON" title="Round-by-round volume" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.6fr)]">
        <Panel className="p-4">
          <RoundVolumeChart games={games} />
        </Panel>
        {standingsQuery.isLoading ? (
          <AsyncState status="loading" label="Loading Regular Season standings" compact />
        ) : standingsQuery.isError ? (
          <AsyncState status="error" inline message="Could not load standings." />
        ) : groups.size === 0 ? (
          <p className="muted text-sm">Standings not available yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...groups.entries()].map(([groupName, entries]) => (
              <RegularSeasonGroupCard key={groupName} groupName={groupName} entries={entries} seasonCode={seasonCode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// A lightweight games-shaped list for `teamCountFromGames`/`dateRangeLabel`
// only, built from the pipeline's postseason-series rows (used by the phase
// progression row; the knockout journey itself uses `buildSeries` below).
function postseasonGamesForCount(phaseSeries) {
  return phaseSeries.flatMap((series) =>
    series.games.map((game) => ({
      scheduledAt: game.scheduledAt,
      localTeam: { clubCode: game.localClubCode },
      roadTeam: { clubCode: game.roadClubCode },
    })),
  );
}

function matchClub(clubCode, clubA, clubB) {
  if (clubCode === clubA.clubCode) return clubA;
  if (clubCode === clubB.clubCode) return clubB;
  return null;
}

function toDisplayGames(rawGames, clubA, clubB) {
  return [...rawGames]
    .sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0))
    .map((game) => ({
      gameCode: game.gameCode,
      scheduledAt: game.scheduledAt,
      played: game.localScore != null && game.roadScore != null,
      localScore: game.localScore,
      roadScore: game.roadScore,
      localTeam: matchClub(game.localClubCode, clubA, clubB),
      roadTeam: matchClub(game.roadClubCode, clubA, clubB),
    }));
}

// The pipeline table reports pairings, not bracket labels, so a phase's
// internal final/placement game is identified structurally instead of by a
// text group name: a series whose both clubs are each some other decided
// series' winner in the same phase is that phase's own final; a series
// whose both clubs are each some other decided series' loser is a
// placement game. Every other series is a regular round.
function loserOf(series) {
  if (!series.winnerClubCode) return null;
  return series.winnerClubCode === series.clubA.clubCode ? series.clubB.clubCode : series.clubA.clubCode;
}

function isChampionshipSeries(target, phaseSeries) {
  const others = phaseSeries.filter((series) => series !== target && series.winnerClubCode);
  return (
    others.some((series) => series.winnerClubCode === target.clubA.clubCode) &&
    others.some((series) => series.winnerClubCode === target.clubB.clubCode)
  );
}

function isPlacementSeries(target, phaseSeries) {
  const others = phaseSeries.filter((series) => series !== target && series.winnerClubCode);
  return (
    others.some((series) => loserOf(series) === target.clubA.clubCode) &&
    others.some((series) => loserOf(series) === target.clubB.clubCode)
  );
}

function buildSeries(allSeries, phaseNameByCode) {
  const byPhase = new Map();
  for (const series of allSeries) {
    if (!byPhase.has(series.phaseCode)) byPhase.set(series.phaseCode, []);
    byPhase.get(series.phaseCode).push(series);
  }

  const result = [];
  for (const [phaseCode, phaseSeries] of byPhase.entries()) {
    for (const raw of phaseSeries) {
      const games = toDisplayGames(raw.games, raw.clubA, raw.clubB);
      const earliestDate = games.map((game) => game.scheduledAt).filter(Boolean).sort()[0] ?? "";

      result.push({
        key: `${phaseCode}:${raw.clubA.clubCode}-${raw.clubB.clubCode}`,
        phaseCode,
        phaseName: phaseNameByCode.get(phaseCode) ?? phaseCode,
        games,
        teamA: raw.clubA,
        teamB: raw.clubB,
        teamACode: raw.clubA.clubCode,
        teamBCode: raw.clubB.clubCode,
        winsA: raw.clubAWins ?? 0,
        winsB: raw.clubBWins ?? 0,
        decided: raw.winnerClubCode != null,
        winnerClubCode: raw.winnerClubCode,
        isChampionship: isChampionshipSeries(raw, phaseSeries),
        isPlacement: isPlacementSeries(raw, phaseSeries),
        earliestDate,
      });
    }
  }

  return result.sort(
    (a, b) =>
      phaseSortIndex(a.phaseCode) - phaseSortIndex(b.phaseCode) ||
      (a.earliestDate < b.earliestDate ? -1 : a.earliestDate > b.earliestDate ? 1 : 0),
  );
}

// Status is derived purely by looking ahead for this club's next appearance
// in the sorted series list, never by assuming this series' winner is the
// only side that keeps playing: EuroLeague's Play-In gives a round-1 loser a
// second game, so a loser who reappears later has genuinely advanced, not
// been eliminated. Only a club with no further appearance is "Eliminated"
// (or "Runner-up"/"4th place" in a decided championship/placement game).
function clubStatus(clubCode, seriesEntry, orderedSeries) {
  if (!seriesEntry.decided) return { text: "In progress", tone: "neutral" };
  const won = seriesEntry.winnerClubCode === clubCode;

  if (seriesEntry.isPlacement) {
    return won ? { text: "3rd place", tone: "success" } : { text: "4th place", tone: "neutral" };
  }

  if (seriesEntry.isChampionship) {
    return won ? { text: "Champion", tone: "success" } : { text: "Runner-up", tone: "neutral" };
  }

  const index = orderedSeries.indexOf(seriesEntry);
  const next = orderedSeries
    .slice(index + 1)
    .find((candidate) => candidate.teamACode === clubCode || candidate.teamBCode === clubCode);

  if (next) {
    const destination = next.isChampionship ? "Championship" : next.phaseName;
    return { text: `Advanced · ${destination}`, tone: "success" };
  }

  return won ? { text: "Advanced", tone: "success" } : { text: "Eliminated", tone: "neutral" };
}

function seriesResultText(seriesEntry, orderedSeries) {
  if (!seriesEntry.decided) return "This series is still in progress.";
  const winner = seriesEntry.winnerClubCode === seriesEntry.teamACode ? seriesEntry.teamA : seriesEntry.teamB;
  const winnerName = teamLabel(winner);
  const winnerWins = seriesEntry.winnerClubCode === seriesEntry.teamACode ? seriesEntry.winsA : seriesEntry.winsB;
  const loserWins = seriesEntry.winnerClubCode === seriesEntry.teamACode ? seriesEntry.winsB : seriesEntry.winsA;
  const isMultiGame = seriesEntry.games.length > 1;
  const resultClause = isMultiGame
    ? `the series ${winnerWins}-${loserWins}`
    : (() => {
        const game = seriesEntry.games[0];
        const localWon = game.localTeam?.clubCode === seriesEntry.winnerClubCode;
        return `${localWon ? game.localScore : game.roadScore}-${localWon ? game.roadScore : game.localScore}`;
      })();

  if (seriesEntry.isChampionship) return `${winnerName} won ${resultClause} to win the championship.`;
  if (seriesEntry.isPlacement) return `${winnerName} won ${resultClause} to finish 3rd.`;

  const index = orderedSeries.indexOf(seriesEntry);
  const next = orderedSeries
    .slice(index + 1)
    .find((candidate) => candidate.teamACode === seriesEntry.winnerClubCode || candidate.teamBCode === seriesEntry.winnerClubCode);
  const destinationClause = next
    ? ` to advance to ${next.isChampionship ? "the championship" : next.phaseName}`
    : "";
  return `${winnerName} won ${resultClause}${destinationClause}.`;
}

function SeriesCard({ seasonCode, seriesEntry, orderedSeries }) {
  const sides = [
    { code: seriesEntry.teamACode, team: seriesEntry.teamA, wins: seriesEntry.winsA },
    { code: seriesEntry.teamBCode, team: seriesEntry.teamB, wins: seriesEntry.winsB },
  ].sort((a, b) => b.wins - a.wins);
  const isMultiGame = seriesEntry.games.length > 1;

  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className={`stat-badge ${seriesEntry.decided ? "stat-badge-success" : "stat-badge-warning"}`}>
          {seriesEntry.decided ? "Final" : "Pending"}
        </span>
        <span className="muted text-xs">{isMultiGame ? "Games won" : "Final score"}</span>
      </div>
      <div className="flex flex-col gap-2">
        {sides.map(({ code, team, wins }) => {
          const isWinner = seriesEntry.decided && seriesEntry.winnerClubCode === code;
          const status = clubStatus(code, seriesEntry, orderedSeries);
          return (
            <div
              key={code ?? teamLabel(team)}
              className={`flex items-center gap-3 rounded-field p-2 ${isWinner ? "bg-success/10" : ""}`}
            >
              <span
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-field ${isWinner ? "ring-2 ring-success" : ""}`}
              >
                {team?.crestUrl ? (
                  <img
                    src={team.crestUrl}
                    alt=""
                    className="h-8 w-8 object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="muted text-xs">{teamLabel(team)}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span className={`block truncate font-medium ${isWinner ? "text-success" : ""}`}>
                  {isWinner ? "✓ " : ""}
                  {teamLabel(team)}
                </span>
                <span className={`block text-xs ${status.tone === "success" ? "text-success" : "muted"}`}>
                  {status.text}
                </span>
              </div>
              <span className="stat-badge stat-badge-neutral tabular-nums">
                {isMultiGame
                  ? wins
                  : (() => {
                      const game = seriesEntry.games[0];
                      const isLocal = game.localTeam?.clubCode === code;
                      return isLocal ? (game.localScore ?? "-") : (game.roadScore ?? "-");
                    })()}
              </span>
            </div>
          );
        })}
      </div>
      <p className="muted mt-3 text-sm">{seriesResultText(seriesEntry, orderedSeries)}</p>
      <details className="mt-3">
        <summary className="link link-hover marker:content-none cursor-pointer text-sm font-medium">
          + Game results
        </summary>
        <ul className="mt-2 flex flex-col gap-1">
          {seriesEntry.games.map((game, index) => (
            <li key={game.gameCode}>
              <Link to={`/${seasonCode}/games/${game.gameCode}`} className="link link-hover text-sm">
                G{index + 1} {teamLabel(game.localTeam)} {game.played ? `${game.localScore}-${game.roadScore}` : "vs"}{" "}
                {teamLabel(game.roadTeam)}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </Panel>
  );
}

function StageSection({ title, code, blurb, seriesList, index, seasonCode, orderedSeries }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="rank rank-1">{index + 1}</span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          {blurb ? <p className="muted text-sm">{blurb}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {seriesList.map((seriesEntry) => (
          <SeriesCard
            key={seriesEntry.key}
            seasonCode={seasonCode}
            seriesEntry={seriesEntry}
            orderedSeries={orderedSeries}
          />
        ))}
      </div>
      {code ? null : null}
    </div>
  );
}

function knockoutStages(series) {
  const stages = [];
  const byPhase = new Map();
  for (const entry of series) {
    if (entry.isPlacement) continue;
    if (!byPhase.has(entry.phaseCode)) byPhase.set(entry.phaseCode, []);
    byPhase.get(entry.phaseCode).push(entry);
  }

  for (const [phaseCode, entries] of byPhase.entries()) {
    if (phaseCode === "FF") {
      const semifinals = entries.filter((entry) => !entry.isChampionship);
      const championship = entries.filter((entry) => entry.isChampionship);
      if (semifinals.length > 0) {
        stages.push({
          title: `${semifinals[0].phaseName} · Semifinals`,
          blurb: STAGE_BLURBS.FF,
          series: semifinals,
          sortIndex: phaseSortIndex(phaseCode),
        });
      }
      if (championship.length > 0) {
        stages.push({
          title: "Championship game",
          blurb: STAGE_BLURBS.CHAMPIONSHIP,
          series: championship,
          sortIndex: phaseSortIndex(phaseCode) + 0.5,
        });
      }
    } else {
      stages.push({
        title: entries[0].phaseName,
        blurb: STAGE_BLURBS[phaseCode],
        series: entries,
        sortIndex: phaseSortIndex(phaseCode),
      });
    }
  }

  return stages.sort((a, b) => a.sortIndex - b.sortIndex);
}

function Legend() {
  return (
    <p className="muted flex flex-wrap items-center gap-4 text-xs">
      <span className="flex items-center gap-1">
        <span aria-hidden="true" className="bg-success inline-block h-2 w-2 rounded-full" /> Matchup winner
      </span>
      <span className="flex items-center gap-1">
        <span aria-hidden="true" className="border-warning inline-block h-3 w-3 rounded-full border-2" /> Series still
        in progress
      </span>
      <span>Open "+ Game results" on any series for the individual games.</span>
    </p>
  );
}

function KnockoutJourney({ seasonCode, series }) {
  const stages = knockoutStages(series);
  const placementSeries = series.filter((entry) => entry.isPlacement);

  if (series.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <PanelHeader kicker="BRACKET" title="Knockout journey" />
      {stages.map((stage, index) => (
        <StageSection
          key={stage.title}
          title={stage.title}
          blurb={stage.blurb}
          seriesList={stage.series}
          index={index}
          seasonCode={seasonCode}
          orderedSeries={series}
        />
      ))}
      {placementSeries.length > 0 ? (
        <div className="border-base-300 rounded-field border border-dashed p-4">
          <p className="eyebrow mb-3">Placement branch</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {placementSeries.map((seriesEntry) => (
              <SeriesCard key={seriesEntry.key} seasonCode={seasonCode} seriesEntry={seriesEntry} orderedSeries={series} />
            ))}
          </div>
        </div>
      ) : null}
      <Legend />
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
  const phases = phasesQuery.data?.phases ?? [];
  const postseasonPhases = phases.filter((phase) => phase.code !== "RS");
  const regularSeasonPhase = phases.find((phase) => phase.code === "RS");

  const regularSeasonGamesQuery = useQuery({
    queryKey: ["format-rs-games", seasonCode],
    queryFn: () => fetchAllPhaseGames(seasonCode, "RS"),
    enabled: Boolean(regularSeasonPhase),
  });

  const postseasonSeriesQuery = useQuery({
    queryKey: ["postseason-series", seasonCode],
    queryFn: () => getPostseasonSeries(seasonCode),
    enabled: phasesQuery.isSuccess,
  });
  const allSeries = postseasonSeriesQuery.data?.series ?? [];

  const seriesByPhase = new Map();
  for (const oneSeries of allSeries) {
    if (!seriesByPhase.has(oneSeries.phaseCode)) seriesByPhase.set(oneSeries.phaseCode, []);
    seriesByPhase.get(oneSeries.phaseCode).push(oneSeries);
  }

  const gamesByPhase = {};
  phases.forEach((phase) => {
    gamesByPhase[phase.code] =
      phase.code === "RS"
        ? (regularSeasonGamesQuery.data ?? [])
        : postseasonGamesForCount(seriesByPhase.get(phase.code) ?? []);
  });

  const phaseNameByCode = new Map(phases.map((phase) => [phase.code, phase.name ?? phase.code]));
  const series = buildSeries(allSeries, phaseNameByCode);

  const dataLoading = (Boolean(regularSeasonPhase) && regularSeasonGamesQuery.isLoading) || postseasonSeriesQuery.isLoading;
  const dataError = regularSeasonGamesQuery.isError || postseasonSeriesQuery.isError;

  if (phasesQuery.isLoading) return <AsyncState status="loading" label="Loading phases" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader kicker="POSTSEASON" title="Playoffs" />

      {dataLoading ? (
        <AsyncState status="loading" label="Loading season format" />
      ) : dataError ? (
        <AsyncState
          status="error"
          message="Could not load games."
          onRetry={() => {
            regularSeasonGamesQuery.refetch();
            postseasonSeriesQuery.refetch();
          }}
        />
      ) : (
        <>
          <PhaseProgressionRow phases={phases} gamesByPhase={gamesByPhase} />

          {regularSeasonPhase ? (
            <RegularSeasonPanel seasonCode={seasonCode} games={gamesByPhase.RS ?? []} />
          ) : null}

          {postseasonPhases.length === 0 ? (
            <p className="muted">The postseason has not started yet for this season.</p>
          ) : (
            <KnockoutJourney seasonCode={seasonCode} series={series} />
          )}
        </>
      )}
    </div>
  );
}
