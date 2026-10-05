import { motion } from "motion/react";
import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import { denseListContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import RevealImage from "../lib/RevealImage";
import { formatTeamValue, usable, useTeamRows } from "../leaders/teamData";
import { STAT_FAMILY_ORDER, directionOf, placeOn, statsOfFamily } from "./teamCompare";

function ClubHead({ row, label }) {
  return (
    <div className="text-center">
      {row?.crestUrl ? <RevealImage src={row.crestUrl} className="mx-auto mb-1 h-12 w-12 object-contain" /> : null}
      <div className="font-semibold">{label}</div>
      {row?.standing?.basic ? (
        <div className="muted text-xs tabular-nums">
          {row.standing.basic.gamesWon}-{row.standing.basic.gamesLost}
        </div>
      ) : null}
    </div>
  );
}

// Every team statistic of the phase side by side, grouped, with each club's place among the league under its bar.
export default function CompareTeamStats({ seasonCode, phaseCode, entityA, entityB }) {
  const source = useTeamRows(seasonCode, phaseCode);
  if (source.isLoading) return <AsyncState status="loading" label="Loading the comparison" />;
  if (source.isError) return <AsyncState status="error" message="Could not load the comparison." onRetry={source.refetch} />;

  const rowA = source.rows.find((row) => row.clubCode === entityA.id);
  const rowB = source.rows.find((row) => row.clubCode === entityB.id);
  if (!rowA || !rowB) return <EmptyText>These clubs have no statistics in this phase yet.</EmptyText>;

  const groups = STAT_FAMILY_ORDER.map((family) => ({
    family,
    stats: statsOfFamily(family, usable, source).filter((stat) => placeOn(source.rows, stat, entityA.id) || placeOn(source.rows, stat, entityB.id)),
  })).filter((group) => group.stats.length > 0);

  return (
    <Panel className="p-3">
      <motion.div variants={denseListContainer} initial="hidden" animate="show">
        <motion.div variants={listItem} className="mb-4 grid grid-cols-2 gap-4">
          <ClubHead row={rowA} label={entityA.label} />
          <ClubHead row={rowB} label={entityB.label} />
        </motion.div>
        <motion.p variants={listItem} className="muted mb-2 text-center text-xs">
          Per game, overtime counted. Under each bar: the club&apos;s place among the {source.rows.length} clubs.
        </motion.p>
        {groups.map((group) => (
          <div key={group.family}>
            <motion.h3 variants={listItem} className="bg-base-200 -mx-3 px-3 py-2 text-sm font-bold">
              {group.family}
            </motion.h3>
            {group.stats.map((stat) => {
              const a = placeOn(source.rows, stat, entityA.id);
              const b = placeOn(source.rows, stat, entityB.id);
              return (
                <ComparisonRow
                  key={stat.key}
                  animated
                  label={stat.label}
                  tip={stat.tip}
                  rawA={a?.value ?? null}
                  rawB={b?.value ?? null}
                  displayA={formatTeamValue(stat, a?.value, "perGame")}
                  displayB={formatTeamValue(stat, b?.value, "perGame")}
                  avgA={a ? `#${a.rank} of ${a.of}` : null}
                  avgB={b ? `#${b.rank} of ${b.of}` : null}
                  direction={directionOf(stat)}
                />
              );
            })}
          </div>
        ))}
      </motion.div>
    </Panel>
  );
}
