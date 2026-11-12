import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { useLiveSearchParams } from "../lib/useLiveSearchParams";
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
import RecordBook, { PopularRecordsHeading, RecordPicker } from "./RecordBook";
import { Board, Podium } from "./RecordParts";
import RecordTimeline from "./RecordTimeline";
import { DEFAULT_FAMILY, DEFAULT_METRIC, FAMILIES, GROUPS, allMetrics, describeRecord, metricsOf, perGameAvailable, pickKey } from "./recordData";

const PANEL_ID = "records-panel";

// Who a record counts, said once on the record book (the API's rule in backend/src/db/season-records.ts).
const RULE_NOTE =
  "Per-game and rate records count players and clubs with at least 67% of their season's regular-season games (23 of 34), and player rates also 10+ minutes a game. Totals and single games count everyone.";

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
// each season and the progression), so a season that never reaches the best 50 still shows in it. From xl the podium sits beside the timeline.
function RecordsContent({ data, seasonCode, unique, onUniqueChange }) {
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
    <m.div key={`${data.family}-${data.metricKey}-${data.per}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
      {/* The minimum is two thirds of a season's regular-season games (the group stage and the Top 16 where there was one); each row has its
          season's minimum. `volume` is a further minimum of minutes or shots, worded by the API. */}
      {data.minGames || data.lowerIsBetter || data.volume ? (
        <p className="muted mb-3 text-xs">
          {data.lowerIsBetter ? <span>Lower is better. </span> : null}
          {data.minGames ? `Counts ${holders} with at least 67% of their season's regular-season games.` : null}
          {data.volume ? <span> Also needs {data.volume}.</span> : null}
        </p>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Podium records={records} bySeason={bySeason} progression={progression} seasonCode={seasonCode} />
        <RecordTimeline bySeason={bySeason} progression={progression} overallKey={records[0].key} label={data.label} lowerIsBetter={data.lowerIsBetter} percent={data.format === "percent"} />
      </div>
      <div className="mt-4">
        <Board
          family={data.family}
          metricKey={data.metricKey}
          label={data.label}
          records={records}
          lowerIsBetter={data.lowerIsBetter}
          seasonCode={seasonCode}
          unique={unique}
          onUniqueChange={onUniqueChange}
        />
      </div>
    </m.div>
  );
}

// The record type, metric and totals-or-per-game an address asks for, each falling back to its default. Anything but `per=game` where per game
// exists reads as totals.
function choicesOf(params) {
  const family = pickKey(FAMILIES, params.get("type"), DEFAULT_FAMILY);
  const metrics = allMetrics(family);
  const metric = pickKey(metrics, params.get("metric"), DEFAULT_METRIC);
  const group = metrics.find((entry) => entry.key === metric).group;
  const hasPer = perGameAvailable(family, group);
  return { family, metrics, metric, hasPer, per: hasPer && params.get("per") === "game" ? "game" : "total" };
}

// One record type and metric: the podium, the timeline and the Top 50. The choices are in the address (`type` and `metric` always, `per=game`
// when chosen) so a view can be linked and Back steps through them.
function RecordsDetail({ seasonCode, params, setParams }) {
  const { family, metric, hasPer, per } = choicesOf(params);
  const familyInfo = FAMILIES.find((entry) => entry.key === family);

  // `changesFor` reads the choices of the live address, so a choice made before the page re-renders builds on the one before it.
  function setAddress(changesFor) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [name, [value, fallback]] of Object.entries(changesFor(choicesOf(current)))) {
        if (value === fallback) next.delete(name);
        else next.set(name, value);
      }
      return next;
    });
  }

  // Changing the kind keeps the metric when the new kind has it, and otherwise opens the default. Per game stays chosen while the new choice
  // has it (a metric can be in the other group), and leaves the address when it does not. The type and metric are always written (a null
  // fallback never matches), so an address without them stays the record book.
  const keepPer = (live, nextFamily, nextGroup) => [live.per === "game" && perGameAvailable(nextFamily, nextGroup) ? "game" : "total", "total"];
  const chooseFamily = (key) =>
    setAddress((live) => {
      const nextMetric = allMetrics(key).some((entry) => entry.key === live.metric) ? live.metric : DEFAULT_METRIC;
      const nextGroup = allMetrics(key).find((entry) => entry.key === nextMetric).group;
      return { type: [key, null], metric: [nextMetric, null], per: keepPer(live, key, nextGroup) };
    });
  const chooseMetric = (key) =>
    setAddress((live) => ({ type: [live.family, null], metric: [key, null], per: keepPer(live, live.family, live.metrics.find((entry) => entry.key === key)?.group) }));
  const choosePer = (key) => setAddress((live) => ({ type: [live.family, null], metric: [live.metric, null], per: [key, "total"] }));
  const metricGroups = GROUPS.map((entry) => ({ label: entry.label, options: metricsOf(family, entry.key) }));
  // One per player or club stays on while the record type and metric change, so it lives here rather than in the Top 50.
  const [unique, setUnique] = useState(false);

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

      {/* The record type, then the metric (its traditional and advanced ones in sections) and, for the season records of the traditional
          metrics only, totals or per game. From lg they share one row, the type on the left; below sm the toggle wraps under the select. */}
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <TabStrip scrolling ariaLabel="Record type" level={1} panelId={PANEL_ID} activeKey={family} onChange={chooseFamily} className="w-fit" tabs={FAMILIES} />
        <div className="flex flex-wrap items-end gap-3">
          <ViewSelect className="w-full sm:w-72" label="Metric" value={metric} groups={metricGroups} onChange={chooseMetric} />
          {hasPer ? <ToggleButtons label="Show" ariaLabel="Totals or per game" choices={PER_CHOICES} value={per} onChange={choosePer} panelId={PANEL_ID} /> : null}
        </div>
      </div>

      <div id={PANEL_ID} aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {query.isError ? (
          <AsyncState status="error" message="Could not load archive records." onRetry={() => query.refetch()} />
        ) : !query.data ? (
          <AsyncState status="loading" label="Loading archive records" skeleton={<RecordDetailSkeleton />} />
        ) : (
          <RecordsContent data={query.data} seasonCode={seasonCode} unique={unique} onUniqueChange={setUnique} />
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
  const [params, setParams] = useLiveSearchParams();
  if (["type", "metric", "per"].some((name) => params.has(name))) return <RecordsDetail seasonCode={seasonCode} params={params} setParams={setParams} />;
  return (
    <div>
      <PageHeader
        kicker="ARCHIVE"
        title="Records"
        description={
          <>
            <p className="muted">The best of every loaded season. Open a record for its Top 50, its timeline and every season.</p>
            <p className="muted mt-1 text-sm">{RULE_NOTE}</p>
          </>
        }
      />
      <RecordPicker seasonCode={seasonCode} />
      <section aria-labelledby="popular-records">
        <PopularRecordsHeading />
        <RecordBook seasonCode={seasonCode} />
      </section>
    </div>
  );
}
