import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getAdvancedStandings, getLeagueTeamStats, getSeasonStandings, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import LabelledSelect from "../lib/LabelledSelect";
import { listContainer } from "../lib/motion";
import Panel from "../lib/Panel";
import SearchField from "../lib/SearchField";
import { TabStrip } from "../lib/TabStrip";
import { advancedScopeForPhase } from "../teams/teamLeague";
import { Avatar, BoardHeader, BoardRow, BoardTopLine, CardGrid, CategoryCard, StatChips } from "./LeaderParts";
import { barShare, rankRows } from "./leaderData";

// ---- What a team can be ranked on ----
// Every stat reads one team row: its season totals for and against (the pipeline's team totals, which count overtime), its
// advanced ratings (the advanced standings) and its record (the standings). `get(row, mode)` is the value; a count is per game
// or a season total.

const perGameOf = (row, mode, total) => (total == null ? null : mode === "perGame" ? (row.gp ? Number(total) / row.gp : null) : Number(total));
const own = (field) => (row, mode) => perGameOf(row, mode, row.stats?.own?.[field]);
const against = (field) => (row, mode) => perGameOf(row, mode, row.stats?.opponent?.[field]);
const share = (side, made, attempted) => (row) => {
  const made_ = Number(row.stats?.[side]?.[made]);
  const attempted_ = Number(row.stats?.[side]?.[attempted]);
  return attempted_ > 0 ? (made_ / attempted_) * 100 : null;
};
const advanced = (field, scale = 1) => (row) => (row.advanced?.[field] == null ? null : Number(row.advanced[field]) * scale);

const TEAM_FAMILIES = ["Record", "Scoring", "Shooting", "Rebounding", "Playmaking", "Defense", "Efficiency"];

const TEAM_STATS = [
  { key: "wins", family: "Record", label: "Wins", short: "W", kind: "int", needs: "standings", get: (row) => row.standing?.basic?.gamesWon ?? null },
  { key: "winPct", family: "Record", label: "Win %", short: "PCT", kind: "percent", needs: "standings",
    get: (row) => (row.standing?.basic?.gamesPlayed ? (row.standing.basic.gamesWon / row.standing.basic.gamesPlayed) * 100 : null) },
  { key: "pointDiff", family: "Record", label: "Point differential", short: "DIFF", kind: "signed", get: (row, mode) => {
    const scored = own("points")(row, mode);
    const allowed = against("points")(row, mode);
    return scored == null || allowed == null ? null : scored - allowed;
  }, tip: "Points scored minus points allowed, overtime included" },

  { key: "points", family: "Scoring", label: "Points", short: "PTS", kind: "count", get: own("points") },
  { key: "threePointersMade", family: "Scoring", label: "3-pointers made", short: "3PM", kind: "count", get: own("fieldGoalsMade3") },
  { key: "freeThrowsMade", family: "Scoring", label: "Free throws made", short: "FTM", kind: "count", get: own("freeThrowsMade") },
  { key: "ortg", family: "Scoring", label: "Offensive rating", short: "ORtg", kind: "decimal", needs: "advanced", get: advanced("offensiveRating"), tip: "Points scored per 100 possessions" },

  { key: "fieldGoalPct", family: "Shooting", label: "Field goal %", short: "FG%", kind: "percent", get: share("own", "fieldGoalsMadeTotal", "fieldGoalsAttemptedTotal") },
  { key: "twoPct", family: "Shooting", label: "2-point %", short: "2P%", kind: "percent", get: share("own", "fieldGoalsMade2", "fieldGoalsAttempted2") },
  { key: "threePct", family: "Shooting", label: "3-point %", short: "3P%", kind: "percent", get: share("own", "fieldGoalsMade3", "fieldGoalsAttempted3") },
  { key: "freeThrowPct", family: "Shooting", label: "Free throw %", short: "FT%", kind: "percent", get: share("own", "freeThrowsMade", "freeThrowsAttempted") },
  { key: "efgPct", family: "Shooting", label: "Effective FG%", short: "eFG%", kind: "percent", needs: "advanced", get: advanced("efgPct", 100), tip: "Field goal percentage with threes weighted 1.5" },
  { key: "tsPct", family: "Shooting", label: "True shooting %", short: "TS%", kind: "percent", needs: "advanced", get: advanced("trueShootingPct", 100) },

  { key: "rebounds", family: "Rebounding", label: "Rebounds", short: "REB", kind: "count", get: own("totalRebounds") },
  { key: "offensiveRebounds", family: "Rebounding", label: "Offensive rebounds", short: "OREB", kind: "count", get: own("offensiveRebounds") },
  { key: "defensiveRebounds", family: "Rebounding", label: "Defensive rebounds", short: "DREB", kind: "count", get: own("defensiveRebounds") },
  { key: "orbPct", family: "Rebounding", label: "Offensive rebound %", short: "ORB%", kind: "percent", needs: "advanced", get: advanced("orbPct", 100) },
  { key: "drbPct", family: "Rebounding", label: "Defensive rebound %", short: "DRB%", kind: "percent", needs: "advanced", get: advanced("drbPct", 100) },

  { key: "assists", family: "Playmaking", label: "Assists", short: "AST", kind: "count", get: own("assistances") },
  { key: "turnovers", family: "Playmaking", label: "Turnovers", short: "TO", kind: "count", lowerIsBetter: true, get: own("turnovers") },
  { key: "tovPct", family: "Playmaking", label: "Turnover %", short: "TOV%", kind: "percent", lowerIsBetter: true, needs: "advanced", get: advanced("tovPct", 100) },
  { key: "pace", family: "Playmaking", label: "Pace", short: "PACE", kind: "decimal", needs: "advanced", get: advanced("pace"), tip: "Possessions per 40 minutes" },

  { key: "oppPoints", family: "Defense", label: "Points allowed", short: "OPP", kind: "count", lowerIsBetter: true, get: against("points") },
  { key: "drtg", family: "Defense", label: "Defensive rating", short: "DRtg", kind: "decimal", lowerIsBetter: true, needs: "advanced", get: advanced("defensiveRating"), tip: "Points allowed per 100 possessions" },
  { key: "oppFieldGoalPct", family: "Defense", label: "Opponents' FG%", short: "OPP FG%", kind: "percent", lowerIsBetter: true, get: share("opponent", "fieldGoalsMadeTotal", "fieldGoalsAttemptedTotal") },
  { key: "oppThreePct", family: "Defense", label: "Opponents' 3-point %", short: "OPP 3P%", kind: "percent", lowerIsBetter: true, get: share("opponent", "fieldGoalsMade3", "fieldGoalsAttempted3") },
  { key: "oppEfgPct", family: "Defense", label: "Opponents' eFG%", short: "OPP eFG%", kind: "percent", lowerIsBetter: true, needs: "advanced", get: advanced("oppEfgPct", 100) },
  { key: "steals", family: "Defense", label: "Steals", short: "STL", kind: "count", get: own("steals") },
  { key: "blocks", family: "Defense", label: "Blocks", short: "BLK", kind: "count", get: own("blocksFavour") },
  { key: "fouls", family: "Defense", label: "Fouls committed", short: "FC", kind: "count", lowerIsBetter: true, get: own("foulsCommited") },

  { key: "net", family: "Efficiency", label: "Net rating", short: "NET", kind: "signed", needs: "advanced", get: advanced("netRating"), tip: "Offensive minus defensive rating, per 100 possessions" },
  { key: "srs", family: "Efficiency", label: "Simple rating (SRS)", short: "SRS", kind: "signed", needs: "advanced", get: advanced("srs"), tip: "Average margin adjusted for the strength of the schedule" },
  { key: "mov", family: "Efficiency", label: "Margin of victory", short: "MOV", kind: "signed", needs: "advanced", get: advanced("mov") },
];

const TEAM_CARDS = ["points", "oppPoints", "net", "ortg", "drtg", "threePct", "rebounds", "assists", "steals"];
const statByKey = (key) => TEAM_STATS.find((stat) => stat.key === key);

function formatTeamValue(stat, value, mode) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (stat.kind === "percent") return `${value.toFixed(1)}%`;
  if (stat.kind === "int") return String(Math.round(value));
  if (stat.kind === "signed") return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
  if (stat.kind === "count" && mode === "accumulated") return Math.round(value).toLocaleString();
  return value.toFixed(1);
}

// One row per club for the phase: totals, advanced ratings and record, joined on the club code. A source that does not have
// the phase (there is no knockout standings table) just leaves its stats empty.
function useTeamRows(seasonCode, phaseCode) {
  const scope = advancedScopeForPhase(phaseCode);
  const statsQuery = useQuery({ queryKey: ["league-team-stats", seasonCode, phaseCode], queryFn: () => getLeagueTeamStats(seasonCode, phaseCode), enabled: Boolean(phaseCode) });
  const advancedQuery = useQuery({ queryKey: ["advanced-standings-team-overview", seasonCode, scope], queryFn: () => getAdvancedStandings(seasonCode, { scope }), enabled: Boolean(phaseCode) });
  const standingsQuery = useQuery({ queryKey: ["standings", seasonCode, phaseCode], queryFn: () => getSeasonStandings(seasonCode, phaseCode), enabled: Boolean(phaseCode) });
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });

  const teamInfo = new Map((teamsQuery.data?.teams ?? []).map((team) => [team.clubCode, team]));
  const advancedRows = new Map((advancedQuery.data?.standings ?? []).map((row) => [row.clubCode, row]));
  const standingRows = new Map((standingsQuery.data?.standings ?? []).map((row) => [row.clubCode, row]));
  const rows = (statsQuery.data?.teams ?? []).map((stats) => {
    const info = teamInfo.get(stats.clubCode);
    return {
      clubCode: stats.clubCode,
      name: info?.name ?? info?.abbreviatedName ?? stats.clubCode,
      crestUrl: info?.crestUrl ?? null,
      gp: Number(stats.gamesPlayed) || 0,
      stats,
      advanced: advancedRows.get(stats.clubCode) ?? null,
      standing: standingRows.get(stats.clubCode) ?? null,
    };
  });
  return {
    rows,
    isLoading: statsQuery.isLoading || teamsQuery.isLoading,
    isError: statsQuery.isError,
    refetch: () => statsQuery.refetch(),
    hasStandings: standingRows.size > 0,
    hasAdvanced: advancedRows.size > 0,
  };
}

function usable(stat, source) {
  return !(stat.needs === "standings" && !source.hasStandings) && !(stat.needs === "advanced" && !source.hasAdvanced);
}

// ---- Landing ----

function TeamCard({ stat, rows, onOpen, isLoading, isError, onRetry }) {
  const direction = stat.lowerIsBetter ? 1 : -1;
  const valued = rows.map((row) => ({ row, value: stat.get(row, "perGame") })).filter((entry) => entry.value !== null && !Number.isNaN(entry.value));
  valued.sort((a, b) => direction * (a.value - b.value));
  const ranked = rankRows(valued.slice(0, 5), (entry) => entry.value);
  const best = ranked[0]?.value ?? null;
  const worst = ranked.length ? ranked[ranked.length - 1].value : 0;
  return (
    <CategoryCard
      kicker={stat.family.toUpperCase()}
      title={stat.label}
      tip={stat.tip}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      onOpen={onOpen}
      entries={ranked.map(({ row: { row }, rank, value }) => ({
        key: row.clubCode,
        rank,
        name: row.name,
        imageUrl: row.crestUrl,
        crest: true,
        team: { code: row.standing?.basic ? `${row.standing.basic.gamesWon}-${row.standing.basic.gamesLost}` : null },
        valueText: formatTeamValue(stat, value, "perGame"),
        share: barShare(value, stat.lowerIsBetter ? worst : best, stat.lowerIsBetter ? best : Math.min(worst, 0)),
      }))}
    />
  );
}

// ---- The full board ----

const PAGE_SIZE = 25;

function TeamsBoard({ seasonCode, metric, source, params, setParams, backToCards }) {
  const stat = statByKey(metric) ?? TEAM_STATS[0];
  const mode = params.get("mode") === "accumulated" ? "accumulated" : "perGame";
  const direction = params.get("direction") ?? (stat.lowerIsBetter ? "asc" : "desc");
  const search = params.get("search") ?? "";
  const [family, setFamily] = useState(stat.family);
  const sign = direction === "asc" ? 1 : -1;

  const valued = source.rows.map((row) => ({ row, value: stat.get(row, mode) })).filter((entry) => entry.value !== null && !Number.isNaN(entry.value));
  valued.sort((a, b) => sign * (a.value - b.value));
  const ranked = rankRows(valued, (entry) => entry.value);
  const shown = ranked.filter(({ row: { row } }) => !search || row.name.toLowerCase().includes(search.toLowerCase()));
  const best = ranked[0]?.value ?? null;
  const last = ranked.length ? ranked[ranked.length - 1].value : 0;
  const top = sign === 1 ? last : best;
  const bottom = sign === 1 ? best : Math.min(last, 0);
  const hasMode = stat.kind === "count";

  function update(patch) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <BoardTopLine onBack={backToCards}>
        <p className="muted text-sm">{hasMode ? (mode === "perGame" ? "Per game" : "Season totals") : "Whole phase"} · overtime counted</p>
      </BoardTopLine>
      <div>
        <TabStrip
          ariaLabel="Team statistic family"
          panelId="leaders-team-stats"
          activeKey={family}
          onChange={setFamily}
          className="mb-3 w-fit"
          tabs={TEAM_FAMILIES.filter((entry) => TEAM_STATS.some((candidate) => candidate.family === entry && usable(candidate, source))).map((entry) => ({ key: entry, label: entry }))}
        />
        <StatChips
          id="leaders-team-stats"
          items={TEAM_STATS.filter((entry) => entry.family === family && usable(entry, source))}
          activeKey={stat.key}
          onChoose={(key) => update({ metric: key, direction: undefined, offset: undefined })}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {hasMode ? (
          <LabelledSelect label="Team statistics" ariaLabel="Team statistics mode" value={mode} onChange={(event) => update({ mode: event.target.value === "perGame" ? undefined : event.target.value })}>
            <option value="perGame">Per game</option>
            <option value="accumulated">Totals</option>
          </LabelledSelect>
        ) : null}
        <LabelledSelect label="Order" ariaLabel="Team sort direction" value={direction} onChange={(event) => update({ direction: event.target.value })}>
          <option value="desc">Highest first</option>
          <option value="asc">Lowest first</option>
        </LabelledSelect>
        <SearchField label="Search teams by name" placeholder="Search teams..." value={search} onChange={(event) => update({ search: event.target.value || undefined })} />
      </div>
      {source.isLoading ? (
        <AsyncState status="loading" label="Loading the team leaderboard" />
      ) : source.isError ? (
        <AsyncState status="error" message="Could not load the team leaderboard." onRetry={source.refetch} />
      ) : shown.length === 0 ? (
        <EmptyText>No teams match.</EmptyText>
      ) : (
        <Panel className="p-2 sm:p-3">
          <BoardHeader columns={["GP", "Record"]} valueLabel={stat.short} />
          <motion.ol variants={listContainer} initial="hidden" animate="show" key={`${stat.key}-${mode}-${direction}-${search}`}>
            {shown.slice(0, PAGE_SIZE).map(({ row: { row }, rank, value }) => (
              <BoardRow
                key={row.clubCode}
                rank={rank}
                avatar={<Avatar imageUrl={row.crestUrl} crest />}
                name={row.name}
                columns={[
                  { label: "Games played", value: row.gp },
                  { label: "Record", value: row.standing?.basic ? `${row.standing.basic.gamesWon}-${row.standing.basic.gamesLost}` : "—" },
                ]}
                valueText={formatTeamValue(stat, value, mode)}
                share={barShare(value, top, bottom)}
                to={`/${seasonCode}/teams/${row.clubCode}`}
              />
            ))}
          </motion.ol>
        </Panel>
      )}
    </div>
  );
}

export default function TeamsLeaders({ seasonCode, phaseCode, params, setParams }) {
  const metric = params.get("metric");
  const source = useTeamRows(seasonCode, phaseCode);
  const openMetric = (key) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("metric", key);
      return next;
    });
  const backToCards = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of ["metric", "mode", "direction", "search"]) next.delete(key);
      return next;
    });

  if (metric) return <TeamsBoard seasonCode={seasonCode} metric={metric} source={source} params={params} setParams={setParams} backToCards={backToCards} />;
  if (source.isError) return <AsyncState status="error" message="Could not load the team leaderboard." onRetry={source.refetch} />;
  return (
    <div className="flex flex-col gap-4">
      {phaseCode !== "RS" ? (
        <p className="muted text-sm">Ratings for the play-in, playoffs and Final Four cover the whole postseason together.</p>
      ) : null}
      <CardGrid>
        {TEAM_CARDS.map((key) => statByKey(key)).filter((stat) => usable(stat, source)).map((stat) => (
          <TeamCard key={stat.key} stat={stat} rows={source.rows} isLoading={source.isLoading} isError={false} onOpen={() => openMetric(stat.key)} />
        ))}
      </CardGrid>
    </div>
  );
}
