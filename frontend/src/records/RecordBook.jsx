import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { getRecordBook } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import HeaderTip from "../lib/HeaderTip";
import { RecordBookSkeleton } from "./RecordsSkeleton";
import { listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import ViewSelect from "../lib/ViewSelect";
import { CodeLabel, Holder, NewBadge } from "./RecordParts";
import { DEFAULT_FAMILY, DEFAULT_METRIC, FAMILIES, GROUPS, allMetrics, describeRecord, metricsOf, whenText } from "./recordData";

// The book's kinds by the page's record types.
const FAMILY_OF = { "player-seasons": "player", "single-games": "game", "team-seasons": "team", "team-games": "teamgame" };

// How far the record leads the row behind it, and whose row that is (a club by its TV code). When the holder also has the row behind, that
// row is their own other season.
function leadText(first, second, sameHolder) {
  const lead = first.value - second.value;
  const runnerUp = sameHolder ? `own ${second.season}` : second.isClub && second.shortName ? <CodeLabel short={second.shortName} full={second.name} /> : second.name;
  return lead === 0 ? <>Tied with {runnerUp}</> : <>{first.change(lead)} over {runnerUp}</>;
}

// One headline record: the metric (the way into its detail view), the value and the holder, whose second line goes on with when the record
// was set and its lead. Below sm the value sits under the metric, in one column beside the holder.
function BookRow({ seasonCode, family, card }) {
  const [first, second] = card.records.map((row) => describeRecord(family, card.format, row));
  const holderOf = (row) => row?.personKey ?? row?.clubCode;
  const sameHolder = Boolean(second) && holderOf(card.records[0]) === holderOf(card.records[1]);
  const details = first ? [whenText(first), second ? leadText(first, second, sameHolder) : null].filter(Boolean) : [];
  return (
    <m.li variants={listItem} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-3 py-2 sm:grid-cols-[7.5rem_4.5rem_minmax(0,1fr)]">
      <div className="flex flex-col items-start sm:contents">
        <div className="flex flex-col items-start gap-1">
          <Link to={`/${seasonCode}/records?type=${family}&metric=${card.metric}`} className="text-sm font-semibold hover:underline">
            {card.label}
            <span aria-hidden="true"> →</span>
          </Link>
          {first ? <NewBadge record={first} seasonCode={seasonCode} /> : null}
        </div>
        <span className="text-lg font-black tabular-nums text-primary sm:text-right sm:text-xl">{first ? first.valueText : "-"}</span>
      </div>
      <div className="min-w-0">
        {first ? (
          <Holder
            record={first}
            size="h-8 w-8"
            compact
            extra={details.map((part, index) => (
              <span key={index} className="wrap-break-word">
                {index > 0 || first.line ? <span aria-hidden="true">· </span> : null}
                {part}
              </span>
            ))}
          />
        ) : (
          <p className="muted text-sm">No record yet</p>
        )}
      </div>
    </m.li>
  );
}

// The way into any record, the advanced ones too: a record type and one of its metrics, opened with the button. Changing the type keeps the
// metric when the new type has it, as the detail view does.
export function RecordPicker({ seasonCode }) {
  const [family, setFamily] = useState(DEFAULT_FAMILY);
  const [metric, setMetric] = useState(DEFAULT_METRIC);
  const chooseFamily = (key) => {
    setFamily(key);
    if (!allMetrics(key).some((entry) => entry.key === metric)) setMetric(DEFAULT_METRIC);
  };
  const metricGroups = GROUPS.map((entry) => ({ label: entry.label, options: metricsOf(family, entry.key) }));
  // A panel of its own, titled and explained, so it does not read as a filter of the popular records under it.
  return (
    <Panel as="section" aria-labelledby="record-finder" className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="eyebrow mb-1">BROWSE</p>
        <h2 id="record-finder" className="panel-title">
          Find any record
        </h2>
        <p className="muted mt-1 text-sm">Choose a record type and a metric, advanced ones included, then open its Top 50 and timeline.</p>
      </div>
      <div className="flex w-full flex-wrap items-end gap-3 lg:w-auto">
        <ViewSelect className="w-full sm:w-48" label="Record type" value={family} options={FAMILIES} onChange={chooseFamily} />
        <ViewSelect className="w-full sm:w-72" label="Metric" value={metric} groups={metricGroups} onChange={setMetric} />
        <Link to={`/${seasonCode}/records?type=${family}&metric=${metric}`} className="btn btn-primary max-sm:w-full">
          Open record
        </Link>
      </div>
    </Panel>
  );
}

// The book's own heading, over its panels and their loading state alike: which records it holds and how to see more of one.
export function PopularRecordsHeading() {
  return (
    <div className="mb-3">
      <h2 id="popular-records" className="text-lg font-bold">
        Popular records
      </h2>
      <p className="muted text-sm">Points, rebounds, assists, steals, blocks and PIR for every record type. Open one for its Top 50 and timeline.</p>
    </div>
  );
}

// The record book: for each record type, its headline records as one list panel (one column, two from lg). A record set in the season being
// viewed is marked new.
export default function RecordBook({ seasonCode }) {
  const query = useQuery({ queryKey: ["records-book", seasonCode], queryFn: () => getRecordBook(seasonCode) });
  if (query.isError) return <AsyncState status="error" message="Could not load the record book." onRetry={() => query.refetch()} />;
  if (!query.data) return <AsyncState status="loading" label="Loading the record book" skeleton={<RecordBookSkeleton />} />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      {query.data.sections.map((section) => {
        const family = FAMILY_OF[section.kind];
        const info = FAMILIES.find((entry) => entry.key === family);
        return (
          <Panel as="section" key={section.kind} aria-labelledby={`book-${family}`} className="p-4 sm:p-5">
            <h3 id={`book-${family}`} className="panel-title">
              <HeaderTip tip={info.description}>{info.label}</HeaderTip>
            </h3>
            <m.ol className="mt-1 divide-y divide-base-300" variants={listContainer} initial="hidden" animate="show">
              {section.cards.map((card) => (
                <BookRow key={card.metric} seasonCode={seasonCode} family={family} card={card} />
              ))}
            </m.ol>
          </Panel>
        );
      })}
    </div>
  );
}
