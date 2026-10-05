import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getPlayerAdvanced } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import { denseListContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import { ADVANCED_FAMILIES, ADVANCED_STATS } from "../leaders/leaderDefs";
import { nameParts, titleCase } from "../lib/playerName";
import { formatAdvancedValue } from "../leaders/leaderData";
import { advancedScopeForPhase } from "../teams/teamLeague";

// The on/off figure of a player is shown only from this many minutes on the floor, as on the player's Advanced tab.
const ON_OFF_MIN_SECONDS = 300 * 60;
// Usage is a role, not a level of quality.
const NEUTRAL = new Set(["usgPct"]);

// Which of the endpoint's ranks answers each statistic (the on/off rank is filed under `onOffNet`).
const RANK_KEY = { onOff: "onOffNet" };

function valueFor(data, key) {
  const latest = data.rounds[data.rounds.length - 1];
  if (key === "per" || key === "winShares" || key === "winSharesPer40") return latest?.[key] ?? null;
  if (key === "rapm") return data.rapm?.rapm ?? null;
  if (key === "onOff") {
    const main = [...(data.onOff ?? [])].sort((x, y) => (y.onSeconds ?? 0) - (x.onSeconds ?? 0))[0];
    return main && (main.onSeconds ?? 0) >= ON_OFF_MIN_SECONDS ? main.netRatingDiff : null;
  }
  return data.extended?.values?.[key] ?? null;
}

function rankFor(data, key) {
  return data.ranks?.[RANK_KEY[key] ?? key] ?? data.extended?.ranks?.[key] ?? null;
}

function directionOf(stat) {
  if (NEUTRAL.has(stat.key)) return "neutral";
  return stat.lowerIsBetter ? "lower" : "higher";
}

function niceName(label) {
  const { last, first } = nameParts(label);
  return `${titleCase(first)} ${titleCase(last)}`.trim();
}

function place(rank) {
  return rank?.rank ? `#${rank.rank} of ${rank.of}` : null;
}

function Group({ family, data }) {
  const stats = ADVANCED_STATS.filter((stat) => stat.family === family);
  return (
    <div>
      <motion.h3 variants={listItem} className="bg-base-200 -mx-3 px-3 py-2 text-sm font-bold">
        {family}
      </motion.h3>
      {stats.map((stat) => {
        const a = valueFor(data.a, stat.key);
        const b = valueFor(data.b, stat.key);
        return (
          <ComparisonRow
            key={stat.key}
            animated
            label={family === "Per 100 possessions" ? `${stat.label} per 100` : stat.label}
            tip={stat.tip}
            rawA={a === null ? null : Number(a)}
            rawB={b === null ? null : Number(b)}
            displayA={formatAdvancedValue(stat, a)}
            displayB={formatAdvancedValue(stat, b)}
            avgA={place(rankFor(data.a, stat.key))}
            avgB={place(rankFor(data.b, stat.key))}
            direction={directionOf(stat)}
          />
        );
      })}
    </div>
  );
}

// The advanced numbers of two players side by side (the same figures as the player pages and the advanced Leaders), each with
// the player's place among everyone with enough minutes.
export default function ComparePlayerAdvanced({ seasonCode, phaseCode, entityA, entityB }) {
  const scope = advancedScopeForPhase(phaseCode);
  const queryFor = (entity) => ({
    queryKey: ["player-advanced", seasonCode, entity.id, scope, "extended"],
    queryFn: () => getPlayerAdvanced(seasonCode, entity.id, { scope, extended: true }),
    enabled: Boolean(phaseCode),
  });
  const queryA = useQuery(queryFor(entityA));
  const queryB = useQuery(queryFor(entityB));
  if (queryA.isPending || queryB.isPending) return <AsyncState status="loading" label="Loading the advanced numbers" />;
  if (queryA.isError || queryB.isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load the advanced numbers."
        onRetry={() => {
          queryA.refetch();
          queryB.refetch();
        }}
      />
    );
  }
  const data = { a: queryA.data, b: queryB.data };
  if (data.a.rounds.length === 0 && data.b.rounds.length === 0) {
    return <EmptyText>Advanced numbers are not available for these players in this phase yet.</EmptyText>;
  }
  const empty = { rounds: [], onOff: [], rapm: null, ranks: null, extended: null };
  const shown = { a: data.a.rounds.length ? data.a : { ...empty, rapm: data.a.rapm }, b: data.b.rounds.length ? data.b : { ...empty, rapm: data.b.rapm } };
  return (
    <Panel className="p-3">
      <motion.div variants={denseListContainer} initial="hidden" animate="show">
        <motion.div variants={listItem} className="mb-4 grid grid-cols-2 gap-4 text-center">
          <div className="font-semibold">{niceName(entityA.label)}</div>
          <div className="font-semibold">{niceName(entityB.label)}</div>
        </motion.div>
        <motion.p variants={listItem} className="muted mb-2 text-center text-xs">
          Running values after the latest round. Under each bar: the place among players with enough minutes. Hover a name for what it means.
        </motion.p>
        {ADVANCED_FAMILIES.map((family) => (
          <Group key={family} family={family} data={shown} />
        ))}
      </motion.div>
    </Panel>
  );
}
