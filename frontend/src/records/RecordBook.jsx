import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getRecordBook } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { RecordBookSkeleton } from "./RecordsSkeleton";
import { listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import { Holder } from "./RecordParts";
import { FAMILIES, describeRecord, whenText } from "./recordData";

// The book's kinds by the page's record types.
const FAMILY_OF = { "player-seasons": "player", "single-games": "game", "team-seasons": "team", "team-games": "teamgame" };

// How far the record leads the row behind it.
function marginText(first, second) {
  const lead = first.value - second.value;
  return lead === 0 ? "Tied with 2nd" : `${first.change(lead)} over 2nd`;
}

// One headline record: the metric (the way into its detail view), the value, the holder, when it was set and its margin.
function BookCard({ seasonCode, family, card }) {
  const [first, second] = card.records.map((row) => describeRecord(family, card.format, row));
  return (
    <motion.li variants={listItem} className="min-w-0">
      <Panel className="flex h-full flex-col gap-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <Link to={`/${seasonCode}/records?type=${family}&metric=${card.metric}`} className="font-semibold hover:underline">
            {card.label}
            <span aria-hidden="true"> →</span>
          </Link>
          {first ? <span className="muted text-sm">{whenText(first)}</span> : null}
        </div>
        {first ? (
          <>
            <p className="text-3xl font-black tabular-nums text-primary">{first.valueText}</p>
            <Holder record={first} size="h-12 w-12" />
            {second ? <p className="muted mt-auto text-sm">{marginText(first, second)}</p> : null}
          </>
        ) : (
          <p className="muted">No record yet</p>
        )}
      </Panel>
    </motion.li>
  );
}

// The record book: for each record type, its headline records as cards (one column, two from sm, three from lg).
export default function RecordBook({ seasonCode }) {
  const query = useQuery({ queryKey: ["records-book", seasonCode], queryFn: () => getRecordBook(seasonCode) });
  if (query.isError) return <AsyncState status="error" message="Could not load the record book." onRetry={() => query.refetch()} />;
  if (!query.data) return <AsyncState status="loading" label="Loading the record book" skeleton={<RecordBookSkeleton />} />;
  return (
    <div className="flex flex-col gap-8">
      {query.data.sections.map((section) => {
        const family = FAMILY_OF[section.kind];
        const info = FAMILIES.find((entry) => entry.key === family);
        return (
          <section key={section.kind} aria-labelledby={`book-${family}`}>
            <h2 id={`book-${family}`} className="panel-title">
              {info.label}
            </h2>
            <p className="muted mb-3 text-sm">{info.description}</p>
            <motion.ol className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3" variants={listContainer} initial="hidden" animate="show">
              {section.cards.map((card) => (
                <BookCard key={card.metric} seasonCode={seasonCode} family={family} card={card} />
              ))}
            </motion.ol>
          </section>
        );
      })}
    </div>
  );
}
