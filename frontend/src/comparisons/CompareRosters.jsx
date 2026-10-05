import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getSeasonTeams, getTeamPlayersAdvanced, getTeamRoster } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatPerGame } from "../lib/format";
import { listContainer, listItem, tableBody, tableRow } from "../lib/motion";
import Panel from "../lib/Panel";
import RevealImage from "../lib/RevealImage";
import { nameParts, titleCase } from "../lib/playerName";
import { Avatar } from "../leaders/LeaderParts";
import { formatAdvancedValue } from "../leaders/leaderData";
import { advancedScopeForPhase } from "../teams/teamLeague";
import { fetchTeamRosterStats } from "../teams/teamRosterStats";

const ROSTER_LIMIT = 100;

function statNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

// One club's roster: each registered player with the season numbers, the biggest minutes first.
function buildRows(registrations, statsByPersonKey) {
  return registrations
    .map((entry) => {
      const stats = statsByPersonKey.get(entry.player?.personKey);
      const traditional = stats?.traditional;
      const games = statNumber(traditional?.gamesPlayed) ?? 0;
      return {
        key: entry.player?.personKey ?? `${entry.dorsal}-${entry.player?.name}`,
        personKey: entry.player?.personKey,
        name: entry.player?.name,
        dorsal: entry.dorsal,
        position: entry.positionName,
        country: entry.player?.countryCode,
        heightCm: statNumber(entry.player?.heightCm),
        age: statNumber(stats?.playerAge),
        imageUrl: stats?.playerImageUrl,
        games,
        minutes: games > 0 ? statNumber(traditional?.minutesPlayed) : null,
        points: games > 0 ? statNumber(traditional?.pointsScored) : null,
        rebounds: games > 0 ? statNumber(traditional?.totalRebounds) : null,
        assists: games > 0 ? statNumber(traditional?.assists) : null,
        pir: games > 0 ? statNumber(traditional?.pir) : null,
      };
    })
    .sort((a, b) => (b.minutes ?? -1) - (a.minutes ?? -1) || a.dorsal - b.dorsal);
}

function average(values) {
  const known = values.filter((value) => value !== null);
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0) / known.length;
}

function summarize(rows) {
  const topScorers = rows
    .map((row) => row.points)
    .filter((value) => value !== null)
    .sort((a, b) => b - a)
    .slice(0, 3);
  return {
    players: rows.length,
    age: average(rows.map((row) => row.age)),
    height: average(rows.map((row) => row.heightCm)),
    nationalities: new Set(rows.map((row) => row.country).filter(Boolean)).size,
    topThree: topScorers.length === 0 ? null : topScorers.reduce((sum, value) => sum + value, 0),
    rotation: rows.filter((row) => (row.minutes ?? 0) >= 15).length,
  };
}

function Crest({ url }) {
  return url ? (
    <RevealImage src={url} className="mx-auto mb-1 h-12 w-12 object-contain" />
  ) : null;
}

function SummaryRows({ a, b, entityA, entityB, crestA, crestB }) {
  const rows = [
    { label: "Players", raw: [a.players, b.players], show: (value) => value, direction: "neutral" },
    { label: "Average age", raw: [a.age, b.age], show: (value) => formatDecimal(value), direction: "neutral" },
    { label: "Average height", raw: [a.height, b.height], show: (value) => (value === null ? "—" : `${Math.round(value)} cm`), direction: "neutral" },
    { label: "Nationalities", raw: [a.nationalities, b.nationalities], show: (value) => value, direction: "neutral" },
    { label: "Points of the top 3 scorers", raw: [a.topThree, b.topThree], show: (value) => formatPerGame(value), direction: "higher" },
    { label: "Players on 15+ minutes", raw: [a.rotation, b.rotation], show: (value) => value, direction: "neutral" },
  ];
  return (
    <motion.div variants={listContainer} initial="hidden" animate="show">
      <motion.div variants={listItem} className="mb-2 grid grid-cols-2 gap-4 text-center">
        <div>
          <Crest url={crestA} />
          <div className="font-semibold">{entityA.label}</div>
        </div>
        <div>
          <Crest url={crestB} />
          <div className="font-semibold">{entityB.label}</div>
        </div>
      </motion.div>
      {rows.map((row) => (
        <ComparisonRow animated key={row.label} label={row.label} rawA={row.raw[0]} rawB={row.raw[1]} displayA={row.show(row.raw[0])} displayB={row.show(row.raw[1])} direction={row.direction} />
      ))}
    </motion.div>
  );
}

// ---- The most impactful players ----

const IMPACT_SHOWN = 5;
const IMPACT_COLUMNS = [
  { key: "per", label: "PER", format: "decimal", tip: "Player efficiency rating; the league average is 15" },
  { key: "winShares", label: "WS", format: "decimal2", tip: "Win Shares: how many of the team's wins the player is responsible for" },
  { key: "winSharesPer40", label: "WS/40", format: "decimal3", tip: "Win Shares per 40 minutes; about 0.100 is average" },
  { key: "usgPct", label: "USG%", format: "percent", tip: "Usage: the share of the team's possessions that end with the player" },
  { key: "tsPct", label: "TS%", format: "percent", tip: "True shooting percentage" },
  { key: "pie", label: "PIE", format: "pie", tip: "Player impact estimate" },
];

function ImpactTable({ seasonCode, entity, crestUrl, players, imageOf }) {
  const top = players
    .filter((player) => player.winShares !== null && player.winShares !== undefined)
    .sort((x, y) => Number(y.winShares) - Number(x.winShares))
    .slice(0, IMPACT_SHOWN);
  const best = top.length ? Number(top[0].winShares) : 0;
  return (
    <Panel className="p-3">
      <div className="mb-3 flex items-center gap-3">
        {crestUrl ? <RevealImage src={crestUrl} className="h-9 w-9 flex-none object-contain" /> : null}
        <div className="min-w-0">
          <h3 className="truncate font-bold">{entity.label}</h3>
          <p className="muted text-xs">Top {IMPACT_SHOWN} by Win Shares</p>
        </div>
      </div>
      {top.length === 0 ? (
        <p className="muted text-sm">No advanced numbers for this club yet.</p>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="table table-sm w-full">
            <thead>
              <tr className="muted text-xs uppercase">
                <th>Player</th>
                {IMPACT_COLUMNS.map((column) => (
                  <th key={column.key} className="text-right" title={column.tip}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <motion.tbody variants={tableBody} initial="hidden" animate="show">
              {top.map((player) => {
                const { last, first } = nameParts(player.playerName);
                const name = (titleCase(first) + " " + titleCase(last)).trim();
                return (
                  <motion.tr key={player.personKey} variants={tableRow}>
                    <td>
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar imageUrl={imageOf(player.personKey)} size="h-8 w-8" />
                        <div className="min-w-0 flex-1">
                          <Link to={"/" + seasonCode + "/players/" + player.personKey} className="block truncate font-semibold hover:underline">
                            {name}
                          </Link>
                          <div aria-hidden="true" className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-base-300">
                            <div className="h-full rounded-full bg-primary" style={{ width: (best > 0 ? Math.max(6, (Number(player.winShares) / best) * 100) : 0) + "%" }} />
                          </div>
                        </div>
                      </div>
                    </td>
                    {IMPACT_COLUMNS.map((column) => (
                      <td key={column.key} className={"text-right tabular-nums " + (column.key === "winShares" ? "font-semibold" : "")}>
                        {formatAdvancedValue(column, player[column.key])}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function RosterTable({ seasonCode, entity, crestUrl, rows }) {
  return (
    <Panel className="p-3">
      <div className="mb-3 flex items-center gap-3">
        {crestUrl ? (
          <RevealImage src={crestUrl} className="h-9 w-9 flex-none object-contain" />
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate font-bold">{entity.label}</h3>
          <p className="muted text-xs">{rows.length} players · per game</p>
        </div>
      </div>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="table table-sm w-full">
          <thead>
            <tr className="muted text-xs uppercase">
              <th className="w-8 text-right">#</th>
              <th>Player</th>
              <th className="text-right">GP</th>
              <th className="text-right">MIN</th>
              <th className="text-right">PTS</th>
              <th className="text-right">REB</th>
              <th className="text-right">AST</th>
              <th className="text-right">PIR</th>
            </tr>
          </thead>
          <motion.tbody variants={tableBody} initial="hidden" animate="show">
            {rows.map((row) => {
              const { last, first } = nameParts(row.name);
              const name = `${titleCase(first)} ${titleCase(last)}`.trim();
              const played = row.games > 0;
              return (
                <motion.tr key={row.key} variants={tableRow} className={played ? "" : "opacity-60"}>
                  <td className="muted text-right tabular-nums">{row.dorsal ?? "—"}</td>
                  <td>
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar imageUrl={row.imageUrl} size="h-8 w-8" />
                      <div className="min-w-0">
                        {row.personKey ? (
                          <Link to={`/${seasonCode}/players/${row.personKey}`} className="block truncate font-semibold hover:underline">
                            {name}
                          </Link>
                        ) : (
                          <span className="block truncate font-semibold">{name}</span>
                        )}
                        <span className="muted block truncate text-xs">{[row.position, row.heightCm ? `${row.heightCm} cm` : null].filter(Boolean).join(" · ")}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{played ? row.games : "—"}</td>
                  <td className="text-right tabular-nums">{formatPerGame(row.minutes)}</td>
                  <td className="text-right font-semibold tabular-nums">{formatPerGame(row.points)}</td>
                  <td className="text-right tabular-nums">{formatPerGame(row.rebounds)}</td>
                  <td className="text-right tabular-nums">{formatPerGame(row.assists)}</td>
                  <td className="text-right tabular-nums">{formatPerGame(row.pir)}</td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>
    </Panel>
  );
}

// The rosters of the two clubs side by side: a few facts about each squad, then every player with the season's numbers.
export default function CompareRosters({ seasonCode, phaseCode, entityA, entityB }) {
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const rosterA = useQuery({ queryKey: ["team-roster", seasonCode, entityA.id], queryFn: () => getTeamRoster(seasonCode, entityA.id, { limit: ROSTER_LIMIT }) });
  const rosterB = useQuery({ queryKey: ["team-roster", seasonCode, entityB.id], queryFn: () => getTeamRoster(seasonCode, entityB.id, { limit: ROSTER_LIMIT }) });
  const statsA = useQuery({
    queryKey: ["team-roster-stats", seasonCode, phaseCode, entityA.id],
    queryFn: () => fetchTeamRosterStats(seasonCode, phaseCode, entityA.id),
    enabled: Boolean(phaseCode),
  });
  const statsB = useQuery({
    queryKey: ["team-roster-stats", seasonCode, phaseCode, entityB.id],
    queryFn: () => fetchTeamRosterStats(seasonCode, phaseCode, entityB.id),
    enabled: Boolean(phaseCode),
  });

  const scope = advancedScopeForPhase(phaseCode);
  const impactA = useQuery({ queryKey: ["team-players-advanced", seasonCode, entityA.id, scope], queryFn: () => getTeamPlayersAdvanced(seasonCode, entityA.id, { scope }), enabled: Boolean(phaseCode) });
  const impactB = useQuery({ queryKey: ["team-players-advanced", seasonCode, entityB.id, scope], queryFn: () => getTeamPlayersAdvanced(seasonCode, entityB.id, { scope }), enabled: Boolean(phaseCode) });

  const queries = [rosterA, rosterB, statsA, statsB];
  if (queries.some((query) => query.isPending)) return <AsyncState status="loading" label="Loading the rosters" />;
  if (queries.some((query) => query.isError)) {
    return <AsyncState status="error" message="Could not load the rosters." onRetry={() => queries.forEach((query) => query.isError && query.refetch())} />;
  }

  const registrationsA = rosterA.data.registrations ?? [];
  const registrationsB = rosterB.data.registrations ?? [];
  if (registrationsA.length === 0 && registrationsB.length === 0) return <EmptyText>No roster is registered for these clubs yet.</EmptyText>;

  const rowsA = buildRows(registrationsA, statsA.data);
  const rowsB = buildRows(registrationsB, statsB.data);
  const crestOf = (id) => (teamsQuery.data?.teams ?? []).find((team) => team.clubCode === id)?.crestUrl;

  const imageByKey = new Map([...rowsA, ...rowsB].map((row) => [row.personKey, row.imageUrl]));
  const imageOf = (personKey) => imageByKey.get(personKey);
  return (
    <div className="flex flex-col gap-6">
      <Panel className="p-3">
        <SummaryRows a={summarize(rowsA)} b={summarize(rowsB)} entityA={entityA} entityB={entityB} crestA={crestOf(entityA.id)} crestB={crestOf(entityB.id)} />
      </Panel>
      <section>
        <div className="mb-3">
          <p className="eyebrow mb-0.5">ADVANCED</p>
          <h3 className="text-lg font-bold">Most impactful players</h3>
          <p className="muted mt-1 text-sm">Running values after the latest round. Hover a column for what it means.</p>
        </div>
        {impactA.isPending || impactB.isPending ? (
          <AsyncState status="loading" label="Loading the advanced numbers" inline />
        ) : impactA.isError || impactB.isError ? (
          <AsyncState
            status="error"
            message="Could not load the advanced numbers."
            inline
            onRetry={() => {
              impactA.refetch();
              impactB.refetch();
            }}
          />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
            <ImpactTable seasonCode={seasonCode} entity={entityA} crestUrl={crestOf(entityA.id)} players={impactA.data.players ?? []} imageOf={imageOf} />
            <ImpactTable seasonCode={seasonCode} entity={entityB} crestUrl={crestOf(entityB.id)} players={impactB.data.players ?? []} imageOf={imageOf} />
          </div>
        )}
      </section>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
        <RosterTable seasonCode={seasonCode} entity={entityA} crestUrl={crestOf(entityA.id)} rows={rowsA} />
        <RosterTable seasonCode={seasonCode} entity={entityB} crestUrl={crestOf(entityB.id)} rows={rowsB} />
      </div>
    </div>
  );
}
