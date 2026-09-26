import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getLeaderStats } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { cardHover, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";

const MotionLink = motion.create(Link);

const CATEGORIES = [
  { key: "pointsScored", label: "Points per game" },
  { key: "totalRebounds", label: "Rebounds per game" },
  { key: "assists", label: "Assists per game" },
  { key: "steals", label: "Steals per game" },
  { key: "pir", label: "PIR per game" },
];

function StatLeaderCard({ seasonCode, category }) {
  const query = useQuery({
    queryKey: ["leader-stats", seasonCode, "all", "perGame", category.key],
    queryFn: () =>
      getLeaderStats(seasonCode, { phase: "all", mode: "perGame", sort: category.key, order: "desc", limit: 1 }),
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
        <span className="name">{leader.playerName ?? leader.personKey}</span>
        <span className="club">{leader.clubName ?? leader.clubCode}</span>
        <span className="value">{leader.traditional[category.key] ?? "-"}</span>
      </div>
      {leader.playerImageUrl ? (
        <img
          src={leader.playerImageUrl}
          alt=""
          className="kpi-chip-image"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </MotionLink>
  );
}

export default function LeadersPanel() {
  const { seasonCode } = useParams();

  return (
    <Panel as="section" className="p-6">
      <PanelHeader kicker="LEADERS" title="Top performers" />
      <motion.div className="leaders-row" variants={listContainer} initial="hidden" animate="show">
        {CATEGORIES.map((category) => (
          <StatLeaderCard key={category.key} seasonCode={seasonCode} category={category} />
        ))}
      </motion.div>
    </Panel>
  );
}
