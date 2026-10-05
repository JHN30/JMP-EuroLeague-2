import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getPlayerSeasonRecords, getSingleGameRecords, getTeamSeasonRecords } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import CompactFilterSelect from "../lib/CompactFilterSelect";
import PageHeader from "../lib/PageHeader";
import { seasonSlug } from "../lib/seasonSlug";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import Panel from "../lib/Panel";
import { useState } from "react";

const METRICS = [["pointsScored", "Points"], ["totalRebounds", "Rebounds"], ["assists", "Assists"], ["pir", "PIR"]];
const SINGLE_GAME_METRICS = { pointsScored: "points", totalRebounds: "totalRebounds", assists: "assistances", pir: "valuation" };

export default function RecordsPage() {
  useDocumentTitle("Records");
  const { seasonCode } = useParams();
  const [metric, setMetric] = useState("pointsScored");
  const [recordType, setRecordType] = useState("player");
  const query = useQuery({
    queryKey: ["records", seasonCode, recordType, metric],
    queryFn: () => {
      if (recordType === "player") return getPlayerSeasonRecords(seasonCode, metric);
      if (recordType === "game") return getSingleGameRecords(seasonCode, SINGLE_GAME_METRICS[metric]);
      return getTeamSeasonRecords(seasonCode, SINGLE_GAME_METRICS[metric]);
    },
  });
  if (query.isLoading) return <AsyncState status="loading" label="Loading archive records" />;
  if (query.isError) return <AsyncState status="error" message="Could not load archive records." onRetry={() => query.refetch()} />;
  const records = query.data.records;
  const progression = records.slice().sort((a, b) => {
    if (recordType === "game") {
      return (new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime()) || a.gameCode - b.gameCode;
    }
    return a.seasonCode.localeCompare(b.seasonCode);
  }).reduce((list, row) => row.numericValue > (list.at(-1)?.numericValue ?? -Infinity) ? [...list, row] : list, []);
  const bestBySeason = recordType === "player" ? Object.values(records.reduce((best, row) => {
    if (!best[row.seasonCode] || row.numericValue > best[row.seasonCode].numericValue) best[row.seasonCode] = row;
    return best;
  }, {})) : [];
  const rowKey = (row) => `${row.seasonCode}-${row.personKey ?? row.clubCode}-${row.gameCode ?? "season"}`;
  const entityName = (row) => recordType === "team" ? row.clubName ?? row.clubCode : row.playerName;
  const entityPath = (row) => recordType === "team"
    ? `/${seasonSlug(row.seasonCode)}/teams/${row.clubCode}`
    : `/${seasonSlug(row.seasonCode)}/players/${row.personKey}`;

  return <div>
    <PageHeader kicker="ARCHIVE" title="Records" description={<p className="muted">Archive-to-date {recordType === "game" ? "single-game" : recordType === "team" ? "team-season" : "player-season"} records.</p>} />
    <Panel className="mb-6 p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <button className={`btn ${recordType === "player" ? "btn-primary" : ""}`} onClick={() => setRecordType("player")}>Player seasons</button>
        <button className={`btn ${recordType === "game" ? "btn-primary" : ""}`} onClick={() => setRecordType("game")}>Single-game</button>
        <button className={`btn ${recordType === "team" ? "btn-primary" : ""}`} onClick={() => setRecordType("team")}>Team-season</button>
      </div>
      <CompactFilterSelect label="Record metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
        {METRICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </CompactFilterSelect>
    </Panel>
    <section className="grid gap-6 lg:grid-cols-2">
      <Panel className="p-4"><h2 className="panel-title mb-3">Podium</h2>{records.slice(0, 3).map((r, i) => <p key={rowKey(r)}><strong>{i + 1}. </strong><Link className="link" to={entityPath(r)}>{entityName(r)}</Link> {r.numericValue}</p>)}</Panel>
      <Panel className="p-4"><h2 className="panel-title mb-3">Record progression</h2>{progression.map((r) => <p key={rowKey(r)}>{r.seasonCode}: {entityName(r)} {r.numericValue}</p>)}</Panel>
    </section>
    {recordType === "player" ? <Panel className="mt-6 p-4"><h2 className="panel-title mb-3">Best in each season</h2>{bestBySeason.map((r) => <p key={`best-${r.seasonCode}`}><strong>{r.seasonCode}:</strong> <Link className="link" to={`/${r.seasonCode}/players/${r.personKey}`}>{r.playerName}</Link> {r.numericValue}</p>)}</Panel> : null}
    <Panel className="mt-6 overflow-x-auto p-4"><h2 className="panel-title mb-3">Top 50</h2>{records.length === 0 ? <p className="muted">No records are available for this metric.</p> : <table className="table"><thead><tr><th>Rank</th><th>{recordType === "team" ? "Team" : "Player"}</th><th>Season</th><th>{query.data.label}</th></tr></thead><tbody>{records.map((r, i) => <tr key={rowKey(r)}><td>{i + 1}</td><td><Link className="link" to={entityPath(r)}>{entityName(r)}</Link>{r.gameCode ? <Link className="link ml-2" to={`/${r.seasonCode}/games/${r.gameCode}`}>Game</Link> : null}</td><td>{r.seasonCode}</td><td>{r.numericValue}</td></tr>)}</tbody></table>}</Panel>
  </div>;
}
