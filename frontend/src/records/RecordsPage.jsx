import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { getPlayerSeasonRecords, getSingleGameRecords, getTeamGameRecords, getTeamSeasonRecords } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { EASE_OUT } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import Panel from "../lib/Panel";
import { TabStrip } from "../lib/TabStrip";
import ViewSelect from "../lib/ViewSelect";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { Board, BestOfEachSeason, Podium, Progression } from "./RecordParts";
import { DEFAULT_FAMILY, DEFAULT_METRIC, FAMILIES, GROUPS, allMetrics, bestOfEachSeason, describeRecord, metricsOf, pickKey, recordProgression } from "./recordData";

const PANEL_ID = "records-panel";

const FETCHERS = { player: getPlayerSeasonRecords, game: getSingleGameRecords, team: getTeamSeasonRecords, teamgame: getTeamGameRecords };

// What one family and metric hold, tagged with the choice that fetched it so the page draws it as that family even while the next choice
// is loading.
async function fetchRecords(seasonCode, family, metric) {
  const data = await FETCHERS[family](seasonCode, metric);
  return { ...data, family, metricKey: metric };
}

function RecordsContent({ data }) {
  const records = useMemo(() => (data.records ?? []).map((row) => describeRecord(data.family, data.group, row)), [data]);
  if (records.length === 0) {
    return (
      <Panel className="p-6">
        <p className="muted">No records are available for this metric.</p>
      </Panel>
    );
  }
  const holders = FAMILIES.find((entry) => entry.key === data.family)?.club ? "clubs" : "players";
  return (
    <motion.div key={`${data.family}-${data.metricKey}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
      {data.minGames ? <p className="muted mb-4 text-sm">Counts {holders} with at least {data.minGames} games.</p> : null}
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

// The archive-to-date records over the loaded seasons: four kinds (player and team, season and single game), each with its traditional and advanced
// metrics. The choices are in the address (`type`, `metric`; the defaults are left out) so a view can be linked and Back steps through them.
export default function RecordsPage() {
  useDocumentTitle("Records");
  const { seasonCode } = useParams();
  const [params, setParams] = useSearchParams();
  const family = pickKey(FAMILIES, params.get("type"), DEFAULT_FAMILY);
  const familyInfo = FAMILIES.find((entry) => entry.key === family);
  const metrics = allMetrics(family);
  const metric = pickKey(metrics, params.get("metric"), DEFAULT_METRIC);
  const group = metrics.find((entry) => entry.key === metric).group;

  function setAddress(changes) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [name, [value, fallback]] of Object.entries(changes)) {
        if (value === fallback) next.delete(name);
        else next.set(name, value);
      }
      return next;
    });
  }

  // Changing the kind keeps the metric when the new kind has it, and otherwise opens the default; a group opens its first metric.
  const chooseFamily = (key) => setAddress({ type: [key, DEFAULT_FAMILY], metric: [allMetrics(key).some((entry) => entry.key === metric) ? metric : DEFAULT_METRIC, DEFAULT_METRIC] });
  const chooseGroup = (key) => setAddress({ metric: [metricsOf(family, key)[0].key, DEFAULT_METRIC] });
  const chooseMetric = (key) => setAddress({ metric: [key, DEFAULT_METRIC] });

  // The rows stay on screen while the next choice loads; the full loading state is only for the very first load.
  const query = useQuery({
    queryKey: ["records", seasonCode, family, metric],
    queryFn: () => fetchRecords(seasonCode, family, metric),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageHeader kicker="ARCHIVE" title="Records" description={<p className="muted">{familyInfo.description}</p>} />

      <TabStrip scrolling ariaLabel="Record type" level={1} panelId={PANEL_ID} activeKey={family} onChange={chooseFamily} className="mb-4 w-fit" tabs={FAMILIES} />
      <TabStrip scrolling ariaLabel="Metric group" level={2} panelId={PANEL_ID} activeKey={group} onChange={chooseGroup} className="mb-3 w-fit max-sm:[--tab-height:2.75rem]!" tabs={GROUPS} />
      {/* The metrics of a group are one select below sm, where a strip of eleven tabs would be a long swipe, and the strip from sm. */}
      <ViewSelect className="mb-6 sm:hidden" label="Metric" value={metric} options={metricsOf(family, group)} onChange={chooseMetric} />
      <TabStrip scrolling ariaLabel="Record metric" level={3} panelId={PANEL_ID} activeKey={metric} onChange={chooseMetric} className="mb-6 max-sm:hidden" tabs={metricsOf(family, group)} />

      <div id={PANEL_ID} aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {query.isError ? (
          <AsyncState status="error" message="Could not load archive records." onRetry={() => query.refetch()} />
        ) : !query.data ? (
          <AsyncState status="loading" label="Loading archive records" />
        ) : (
          <RecordsContent data={query.data} />
        )}
      </div>
    </div>
  );
}
