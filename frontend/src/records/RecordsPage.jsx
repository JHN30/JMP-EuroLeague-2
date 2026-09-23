import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getPlayerSeasonRecords } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import CompactFilterSelect from "../lib/CompactFilterSelect";
import PageHeader from "../lib/PageHeader";
import Panel from "../lib/Panel";
import { useState } from "react";

const METRICS = [["pointsScored", "Points"], ["totalRebounds", "Rebounds"], ["assists", "Assists"], ["pir", "PIR"]];

export default function RecordsPage() {
  const { seasonCode } = useParams();
  const [metric, setMetric] = useState("pointsScored");
  const query = useQuery({ queryKey: ["player-season-records", metric], queryFn: () => getPlayerSeasonRecords(seasonCode, metric) });
  if (query.isLoading) return <AsyncState status="loading" label="Loading archive records" />;
  if (query.isError) return <AsyncState status="error" message="Could not load archive records." onRetry={() => query.refetch()} />;
  const records = query.data.records;
  const progression = records.slice().reverse().reduce((list, row) => row.numericValue > (list.at(-1)?.numericValue ?? -Infinity) ? [...list, row] : list, []);
  const bestBySeason = Object.values(records.reduce((best, row) => {
    if (!best[row.seasonCode] || row.numericValue > best[row.seasonCode].numericValue) best[row.seasonCode] = row;
    return best;
  }, {}));
  return <div><PageHeader kicker="ARCHIVE" title="Records" description={<p className="muted">Archive-to-date player-season records.</p>} /><Panel className="mb-6 p-4"><div className="grid gap-2 sm:grid-cols-3"><button className="btn btn-primary">Player seasons</button><button className="btn" disabled>Single-game - Coming next</button><button className="btn" disabled>Team-season - Coming next</button></div><CompactFilterSelect label="Record metric" value={metric} onChange={(e) => setMetric(e.target.value)}>{METRICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</CompactFilterSelect></Panel><section className="grid gap-6 lg:grid-cols-2"><Panel className="p-4"><h2 className="panel-title mb-3">Podium</h2>{records.slice(0, 3).map((r, i) => <p key={`${r.seasonCode}-${r.personKey}`}><strong>{i + 1}. </strong><Link className="link" to={`/${r.seasonCode}/players/${r.personKey}`}>{r.playerName}</Link> {r.numericValue}</p>)}</Panel><Panel className="p-4"><h2 className="panel-title mb-3">Record progression</h2>{progression.map((r) => <p key={`${r.seasonCode}-${r.personKey}`}>{r.seasonCode}: {r.playerName} {r.numericValue}</p>)}</Panel></section><Panel className="mt-6 p-4"><h2 className="panel-title mb-3">Best in each season</h2>{bestBySeason.map((r) => <p key={`best-${r.seasonCode}`}><strong>{r.seasonCode}:</strong> <Link className="link" to={`/${r.seasonCode}/players/${r.personKey}`}>{r.playerName}</Link> {r.numericValue}</p>)}</Panel><Panel className="mt-6 overflow-x-auto p-4"><h2 className="panel-title mb-3">Top 50</h2><table className="table"><thead><tr><th>Rank</th><th>Player</th><th>Season</th><th>{query.data.label}</th></tr></thead><tbody>{records.map((r, i) => <tr key={`${r.seasonCode}-${r.personKey}`}><td>{i + 1}</td><td><Link className="link" to={`/${r.seasonCode}/players/${r.personKey}`}>{r.playerName}</Link></td><td>{r.seasonCode}</td><td>{r.numericValue}</td></tr>)}</tbody></table></Panel></div>;
}
