import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams, useSearchParams } from "react-router";
import { getPhases } from "../lib/api";
import { EASE_OUT } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import { TabStrip } from "../lib/TabStrip";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import AdvancedLeaders from "./AdvancedLeaders";
import PlayersLeaders from "./PlayersLeaders";
import TeamsLeaders from "./TeamsLeaders";

const SCOPES = [
  { key: "players", label: "Players" },
  { key: "teams", label: "Teams" },
  { key: "advanced", label: "Advanced" },
];
// What belongs to one scope's view and must not leak into another's when the scope changes.
const SCOPE_PARAMS = ["metric", "mode", "direction", "minGames", "minMinutes", "team", "position", "search", "offset", "ascope"];

// The league leaders: players (per game and totals), teams, and the advanced player metrics. Each scope opens on a grid of
// category cards (the top five of each) and opens a full leaderboard for one stat; everything is in the URL so a leaderboard
// can be shared.
export default function LeadersPage() {
  useDocumentTitle("Leaders");
  const { seasonCode } = useParams();
  const [params, setParams] = useSearchParams();
  const scope = SCOPES.some((entry) => entry.key === params.get("scope")) ? params.get("scope") : "players";

  const phasesQuery = useQuery({ queryKey: ["phases", seasonCode], queryFn: () => getPhases(seasonCode) });
  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode, setPhaseCode] = usePhaseParam(phases);

  const showPhase = scope !== "advanced" && phases.length > 0;

  function chooseScope(key) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const name of SCOPE_PARAMS) next.delete(name);
      if (key === "players") next.delete("scope");
      else next.set("scope", key);
      return next;
    });
  }

  function choosePhase(code) {
    setPhaseCode(code);
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const name of ["offset", "team", "position", "search", "minGames"]) next.delete(name);
      return next;
    });
  }

  return (
    <div>
      <PageHeader kicker="LEADERBOARDS" title="Leaders" />

      <TabStrip scrolling ariaLabel="Leaderboard scope" level={1} panelId="leaders-panel" activeKey={scope} onChange={chooseScope} className={`w-fit ${showPhase ? "mb-4" : "mb-6"}`} tabs={SCOPES} />
      {showPhase ? (
        <TabStrip
          scrolling
          ariaLabel="Statistics phase"
          level={2}
          panelId="leaders-panel"
          activeKey={phaseCode}
          onChange={choosePhase}
          className="mb-6 w-fit"
          tabs={phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
        />
      ) : null}

      <motion.div id="leaders-panel" key={scope} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
        {scope === "players" ? (
          <PlayersLeaders seasonCode={seasonCode} phaseCode={phaseCode} params={params} setParams={setParams} />
        ) : scope === "teams" ? (
          <TeamsLeaders seasonCode={seasonCode} phaseCode={phaseCode} params={params} setParams={setParams} />
        ) : (
          <AdvancedLeaders seasonCode={seasonCode} params={params} setParams={setParams} />
        )}
      </motion.div>
    </div>
  );
}
