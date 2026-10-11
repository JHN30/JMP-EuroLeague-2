import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { getPlayerSeasonRecords, getSeasonTeams, getSingleGameRecords, getTeamSeasonRecords } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { EASE_OUT } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import Panel from "../lib/Panel";
import { TabStrip } from "../lib/TabStrip";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { Board, BestOfEachSeason, Podium, Progression } from "./RecordParts";
import { FAMILIES, METRICS, ROUTE_METRICS, bestOfEachSeason, describeRecord, pickKey, recordProgression } from "./recordData";

const DEFAULT_FAMILY = "player";
const DEFAULT_METRIC = "pointsScored";
const PANEL_ID = "records-panel";

// What one family and metric hold, tagged with the choice that fetched it so the page draws it as that family even while the next choice
// is loading.
async function fetchRecords(seasonCode, family, metric) {
  const data =
    family === "player"
      ? await getPlayerSeasonRecords(seasonCode, metric)
      : family === "game"
        ? await getSingleGameRecords(seasonCode, ROUTE_METRICS[metric])
        : await getTeamSeasonRecords(seasonCode, ROUTE_METRICS[metric]);
  return { ...data, family, metricKey: metric };
}

function RecordsContent({ data, crestOf }) {
  const records = useMemo(() => (data.records ?? []).map((row) => describeRecord(data.family, row, crestOf)), [data, crestOf]);
  if (records.length === 0) {
    return (
      <Panel className="p-6">
        <p className="muted">No records are available for this metric.</p>
      </Panel>
    );
  }
  return (
    <motion.div key={`${data.family}-${data.metricKey}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
      <Podium records={records} label={data.label} />
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <Progression steps={recordProgression(records)} />
        <BestOfEachSeason records={bestOfEachSeason(records)} overall={records[0]} />
      </div>
      <div className="mt-6">
        <Board family={data.family} metricKey={data.metricKey} label={data.label} records={records} />
      </div>
    </motion.div>
  );
}

// The archive-to-date records over the loaded seasons: player seasons, single games and team seasons, for four metrics. The two choices are
// in the address (`type`, `metric`; the defaults are left out) so a view can be linked and Back steps through them.
export default function RecordsPage() {
  useDocumentTitle("Records");
  const { seasonCode } = useParams();
  const [params, setParams] = useSearchParams();
  const family = pickKey(FAMILIES, params.get("type"), DEFAULT_FAMILY);
  const metric = pickKey(METRICS, params.get("metric"), DEFAULT_METRIC);
  const familyInfo = FAMILIES.find((entry) => entry.key === family);

  function choose(name, value, fallback) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === fallback) next.delete(name);
      else next.set(name, value);
      return next;
    });
  }

  // The rows stay on screen while the next choice loads; the full loading state is only for the very first load.
  const query = useQuery({
    queryKey: ["records", seasonCode, family, metric],
    queryFn: () => fetchRecords(seasonCode, family, metric),
    placeholderData: keepPreviousData,
  });

  // Club crests for the team-season records come from the season's own teams; a club that season does not list has none.
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode), enabled: query.data?.family === "team" });
  const crests = useMemo(() => new Map((teamsQuery.data?.teams ?? []).map((team) => [team.clubCode, team.crestUrl ?? null])), [teamsQuery.data]);
  const crestOf = useMemo(() => (clubCode) => crests.get(clubCode) ?? null, [crests]);

  return (
    <div>
      <PageHeader kicker="ARCHIVE" title="Records" description={<p className="muted">{familyInfo.description}</p>} />

      <TabStrip scrolling ariaLabel="Record type" level={1} panelId={PANEL_ID} activeKey={family} onChange={(key) => choose("type", key, DEFAULT_FAMILY)} className="mb-4 w-fit" tabs={FAMILIES} />
      <TabStrip scrolling ariaLabel="Record metric" level={2} panelId={PANEL_ID} activeKey={metric} onChange={(key) => choose("metric", key, DEFAULT_METRIC)} className="mb-6 w-fit" tabs={METRICS} />

      <div id={PANEL_ID} aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {query.isError ? (
          <AsyncState status="error" message="Could not load archive records." onRetry={() => query.refetch()} />
        ) : !query.data ? (
          <AsyncState status="loading" label="Loading archive records" />
        ) : (
          <RecordsContent data={query.data} crestOf={crestOf} />
        )}
      </div>
    </div>
  );
}
