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
import { ModeSelect, ModeTabs } from "../leaders/LeaderParts";
import { Board, Podium } from "./RecordParts";
import RecordTimeline from "./RecordTimeline";
import { DEFAULT_FAMILY, DEFAULT_METRIC, FAMILIES, GROUPS, allMetrics, describeRecord, metricsOf, perGameAvailable, pickKey } from "./recordData";

const PANEL_ID = "records-panel";

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

  // Changing the kind keeps the metric when the new kind has it, and otherwise opens the default; a group opens its first metric. Per game
  // stays chosen while the new choice has it, and leaves the address when it does not.
  const keepPer = (nextFamily, nextGroup) => [per === "game" && perGameAvailable(nextFamily, nextGroup) ? "game" : "total", "total"];
  const chooseFamily = (key) => {
    const nextMetric = allMetrics(key).some((entry) => entry.key === metric) ? metric : DEFAULT_METRIC;
    const nextGroup = allMetrics(key).find((entry) => entry.key === nextMetric).group;
    setAddress({ type: [key, DEFAULT_FAMILY], metric: [nextMetric, DEFAULT_METRIC], per: keepPer(key, nextGroup) });
  };
  const chooseGroup = (key) => setAddress({ metric: [metricsOf(family, key)[0].key, DEFAULT_METRIC], per: keepPer(family, key) });
  const chooseMetric = (key) => setAddress({ metric: [key, DEFAULT_METRIC] });
  // ModeTabs and ModeSelect name the choices as Leaders does (perGame, accumulated).
  const choosePer = (key) => setAddress({ per: [key === "perGame" ? "game" : "total", "total"] });
  const perMode = per === "game" ? "perGame" : "accumulated";

  // The rows stay on screen while the next choice loads; the full loading state is only for the very first load.
  const query = useQuery({
    queryKey: ["records", seasonCode, family, metric, per],
    queryFn: () => fetchRecords(seasonCode, family, metric, per),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageHeader kicker="ARCHIVE" title="Records" description={<p className="muted">{familyInfo.description}</p>} />

      <TabStrip scrolling ariaLabel="Record type" level={1} panelId={PANEL_ID} activeKey={family} onChange={chooseFamily} className="mb-4 w-fit" tabs={FAMILIES} />
      <TabStrip scrolling ariaLabel="Metric group" level={2} panelId={PANEL_ID} activeKey={group} onChange={chooseGroup} className="mb-3 w-fit max-sm:[--tab-height:2.75rem]!" tabs={GROUPS} />
      {/* The metrics of a group are one select below sm, where a strip of eleven tabs would be a long swipe, and the strip from sm. */}
      <ViewSelect className={`sm:hidden ${hasPer ? "mb-3" : "mb-6"}`} label="Metric" value={metric} options={metricsOf(family, group)} onChange={chooseMetric} />
      <TabStrip scrolling ariaLabel="Record metric" level={3} panelId={PANEL_ID} activeKey={metric} onChange={chooseMetric} className={`max-sm:hidden ${hasPer ? "mb-3" : "mb-6"}`} tabs={metricsOf(family, group)} />
      {/* Totals or per game, for the season records of the traditional metrics only. */}
      {hasPer ? (
        <div className="mb-6">
          <ModeTabs ariaLabel="Totals or per game" mode={perMode} onChange={choosePer} panelId={PANEL_ID} />
          <ModeSelect label="Show" ariaLabel="Totals or per game" mode={perMode} onChange={choosePer} />
        </div>
      ) : null}

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
