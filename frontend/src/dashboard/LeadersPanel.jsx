import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getLeaderStats } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { cardHover, listContainer, listItem } from "../lib/motion";
import { PHASE_NAMES } from "../lib/phaseSummary";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useCurrentPhaseCode } from "../lib/useCurrentPhaseCode";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { withoutComma } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";

const MotionLink = motion.create(Link);

const CATEGORIES = [
  { key: "pointsScored", label: "Points per game" },
  { key: "totalRebounds", label: "Rebounds per game" },
  { key: "assists", label: "Assists per game" },
  { key: "pir", label: "PIR per game" },
];

function StatLeaderCard({ seasonCode, category, phaseCode }) {
  const query = useQuery({
    queryKey: ["leader-stats", seasonCode, phaseCode, "perGame", category.key],
    queryFn: () =>
      getLeaderStats(seasonCode, { phase: phaseCode, mode: "perGame", sort: category.key, order: "desc", limit: 1, qualified: true }),
  });
  const leader = query.data?.players[0] ?? null;

  const status = query.isLoading ? "loading" : query.isError ? "error" : !leader ? "empty" : "ready";

  if (status !== "ready") {
    return (
      <div className="kpi-chip">
        <div className="kpi-chip-body">
          <span className="label">{category.label}</span>
          <AsyncState inline status={status} message={query.isError ? "Could not load." : "Not available yet."} />
        </div>
      </div>
    );
  }

  return (
    <MotionLink
      to={`/${seasonCode}/players/${leader.personKey}`}
      className="kpi-chip kpi-chip-link"
      variants={listItem}
      {...cardHover}
    >
      <div className="kpi-chip-body">
        <span className="label">{category.label}</span>
        <span className="name">{withoutComma(leader.playerName ?? leader.personKey)}</span>
        <span className="club">{leader.clubName ?? leader.clubCode}</span>
        <span className="value">{leader.traditional[category.key] ?? "-"}</span>
      </div>
      {leader.playerImageUrl ? (
        <RevealImage src={leader.playerImageUrl} effect="wipe" className="kpi-chip-image" />
      ) : null}
    </MotionLink>
  );
}

function PhaseLeadersGroup({ seasonCode, phaseCode, showHeading }) {
  const isSwipeRow = useMediaQuery("not (min-width: 40rem)");
  return (
    <div>
      {showHeading ? (
        <h3 className="mb-2 font-semibold">{PHASE_NAMES[phaseCode] ?? phaseCode}</h3>
      ) : null}
      <motion.div
        className="leaders-row"
        role="group"
        aria-label={`${PHASE_NAMES[phaseCode] ?? phaseCode} leaders`}
        tabIndex={isSwipeRow ? 0 : undefined}
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {CATEGORIES.map((category) => (
          <StatLeaderCard key={category.key} seasonCode={seasonCode} category={category} phaseCode={phaseCode} />
        ))}
      </motion.div>
    </div>
  );
}

export default function LeadersPanel() {
  const { seasonCode } = useParams();
  const phaseCode = useCurrentPhaseCode(seasonCode);
  // Once postseason stats (a combined "PS" phase) are available from the
  // pipeline, this can go back to a single phase - for now, a season that
  // has moved past Regular Season shows both, since RS and postseason
  // leaders are each genuinely interesting and there's no combined view yet.
  const phasesToShow = phaseCode === "RS" ? ["RS"] : ["RS", phaseCode];

  return (
    <Panel as="section" className="p-4 sm:p-5 lg:p-6">
      <PanelHeader
        kicker="LEADERS"
        title={phasesToShow.length === 1 ? (PHASE_NAMES[phaseCode] ?? phaseCode) : "Top performers"}
      />
      <div className="flex flex-col gap-6">
        {phasesToShow.map((code) => (
          <PhaseLeadersGroup
            key={code}
            seasonCode={seasonCode}
            phaseCode={code}
            showHeading={phasesToShow.length > 1}
          />
        ))}
      </div>
    </Panel>
  );
}
