import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { getPlayerSeasonRecords, getSingleGameRecords, getTeamGameRecords, getTeamSeasonRecords } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { RecordDetailSkeleton } from "./RecordsSkeleton";
import BackLink from "../lib/BackLink";
import { EASE_OUT } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import Panel from "../lib/Panel";
import { TabStrip } from "../lib/TabStrip";
import ToggleButtons from "../lib/ToggleButtons";
import ViewSelect from "../lib/ViewSelect";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import RecordBook from "./RecordBook";
import { Board, Podium } from "./RecordParts";
import RecordTimeline from "./RecordTimeline";
import { DEFAULT_FAMILY, DEFAULT_METRIC, FAMILIES, GROUPS, allMetrics, describeRecord, metricsOf, perGameAvailable, pickKey } from "./recordData";

const PANEL_ID = "records-panel";

const PER_CHOICES = [
  { key: "total", label: "Totals" },
  { key: "game", label: "Per game" },
];

const FETCHERS = { player: getPlayerSeasonRecords, game: getSingleGameRecords, team: getTeamSeasonRecords, teamgame: getTeamGameRecords };

// What one family and metric hold, tagged with the choice that fetched it so the page draws it as that family even while the next choice
// is loading.
async function fetchRecords(seasonCode, family, metric, per) {
  const data = await FETCHERS[family](seasonCode, metric, per);
  return { ...data, family, metricKey: metric };
}

// The Podium and the Top 50 read `records`, the overall best 50. The timeline reads the API's own lists over every loaded season (the best of
// each season and the progression), so a season that never reaches the best 50 still shows in it.
function RecordsContent({ data }) {
  const [records, bySeason, progression] = useMemo(() => {
    const describe = (rows) => (rows ?? []).map((row) => describeRecord(data.family, data.format, row));
    return [describe(data.records), describe(data.bySeason), describe(data.progression)];
  }, [data]);
  if (records.length === 0) {
    return (
      <Panel className="p-6">
        <p className="muted">No records are available for this metric.</p>
      </Panel>
    );
  }
  const holders = FAMILIES.find((entry) => entry.key === data.family)?.club ? "clubs" : "players";
  return (
    <motion.div key={`${data.family}-${data.metricKey}-${data.per}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
      {/* The minimum is for a 34-game regular season; each season keeps the same share of its own (22 of 38, 6 of 10). `volume` is a further
          minimum of minutes or shots, worded by the API. */}
      {data.minGames || data.lowerIsBetter || data.volume ? (
        <p className="muted mb-4 text-sm">
          {data.lowerIsBetter ? <span>Lower is better. </span> : null}
          {data.minGames ? `Counts ${holders} with at least ${data.minGames} games of a 34-game regular season, or the same share of a shorter or longer one.` : null}
          {data.volume ? <span> Also needs {data.volume}.</span> : null}
        </p>
      ) : null}
      <Podium records={records} label={data.label} />
      <div className="mt-6">
        <RecordTimeline bySeason={bySeason} progression={progression} overallKey={records[0].key} label={data.label} lowerIsBetter={data.lowerIsBetter} percent={data.format === "percent"} />
      </div>
      <div className="mt-6">
        <Board family={data.family} metricKey={data.metricKey} label={data.label} records={records} lowerIsBetter={data.lowerIsBetter} />
      </div>
    </motion.div>
  );
}

// One record type and metric: the podium, the timeline and the Top 50. The choices are in the address (`type` and `metric` always, `per=game`
// when chosen) so a view can be linked and Back steps through them.
function RecordsDetail({ seasonCode, params, setParams }) {
  const family = pickKey(FAMILIES, params.get("type"), DEFAULT_FAMILY);
  const familyInfo = FAMILIES.find((entry) => entry.key === family);
  const metrics = allMetrics(family);
  const metric = pickKey(metrics, params.get("metric"), DEFAULT_METRIC);
  const group = metrics.find((entry) => entry.key === metric).group;
  const hasPer = perGameAvailable(family, group);
  // Anything but `per=game` where per game exists reads as totals.
  const per = hasPer && params.get("per") === "game" ? "game" : "total";

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

  // Changing the kind keeps the metric when the new kind has it, and otherwise opens the default. Per game stays chosen while the new choice
  // has it (a metric can be in the other group), and leaves the address when it does not. The type and metric are always written (a null
  // fallback never matches), so an address without them stays the record book.
  const keepPer = (nextFamily, nextGroup) => [per === "game" && perGameAvailable(nextFamily, nextGroup) ? "game" : "total", "total"];
  const chooseFamily = (key) => {
    const nextMetric = allMetrics(key).some((entry) => entry.key === metric) ? metric : DEFAULT_METRIC;
    const nextGroup = allMetrics(key).find((entry) => entry.key === nextMetric).group;
    setAddress({ type: [key, null], metric: [nextMetric, null], per: keepPer(key, nextGroup) });
  };
  const chooseMetric = (key) => setAddress({ type: [family, null], metric: [key, null], per: keepPer(family, metrics.find((entry) => entry.key === key).group) });
  const choosePer = (key) => setAddress({ type: [family, null], metric: [metric, null], per: [key, "total"] });
  const metricGroups = GROUPS.map((entry) => ({ label: entry.label, options: metricsOf(family, entry.key) }));

  // The rows stay on screen while the next choice loads; the full loading state is only for the very first load.
  const query = useQuery({
    queryKey: ["records", seasonCode, family, metric, per],
    queryFn: () => fetchRecords(seasonCode, family, metric, per),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <BackLink to={`/${seasonCode}/records`} label="Record book" />
      <PageHeader kicker="ARCHIVE" title="Records" description={<p className="muted">{familyInfo.description}</p>} />

      <TabStrip scrolling ariaLabel="Record type" level={1} panelId={PANEL_ID} activeKey={family} onChange={chooseFamily} className="mb-4 w-fit" tabs={FAMILIES} />
      {/* One row of choices under the record type: the metric (its traditional and advanced ones in sections) and, for the season records
          of the traditional metrics only, totals or per game. Below sm the toggle wraps under the select. */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <ViewSelect className="w-full sm:w-72" label="Metric" value={metric} groups={metricGroups} onChange={chooseMetric} />
        {hasPer ? <ToggleButtons label="Show" ariaLabel="Totals or per game" choices={PER_CHOICES} value={per} onChange={choosePer} panelId={PANEL_ID} /> : null}
      </div>

      <div id={PANEL_ID} aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {query.isError ? (
          <AsyncState status="error" message="Could not load archive records." onRetry={() => query.refetch()} />
        ) : !query.data ? (
          <AsyncState status="loading" label="Loading archive records" skeleton={<RecordDetailSkeleton />} />
        ) : (
          <RecordsContent data={query.data} />
        )}
      </div>
    </div>
  );
}

// The archive-to-date records over the loaded seasons. With no choice in the address the page is the record book (the headline records of
// every type); any of `type`, `metric` or `per` opens that record's detail view.
export default function RecordsPage() {
  useDocumentTitle("Records");
  const { seasonCode } = useParams();
  const [params, setParams] = useSearchParams();
  if (["type", "metric", "per"].some((name) => params.has(name))) return <RecordsDetail seasonCode={seasonCode} params={params} setParams={setParams} />;
  return (
    <div>
      <PageHeader
        kicker="ARCHIVE"
        title="Records"
        description={<p className="muted">The best of every loaded season. Open a record for its Top 50, its timeline and every season.</p>}
      />
      <RecordBook seasonCode={seasonCode} />
    </div>
  );
}
