import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { cardHover, listContainer, listItem } from "../lib/motion";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { shortTeamName } from "../games/gameUtils";

const MotionLink = motion.create(Link);

export default function TeamsPage() {
  useDocumentTitle("Teams");
  const { seasonCode } = useParams();

  const teamsQuery = useQuery({
    queryKey: ["teams", seasonCode],
    queryFn: () => getSeasonTeams(seasonCode),
  });

  const teams = teamsQuery.data?.teams ?? [];

  return (
    <div>
      <PageHeader kicker="CLUBS" title="Teams" />

      {teamsQuery.isLoading ? (
        <AsyncState status="loading" label="Loading teams" />
      ) : teamsQuery.isError ? (
        <AsyncState status="error" message="Could not load teams." onRetry={() => teamsQuery.refetch()} />
      ) : teams.length === 0 ? (
        <EmptyText>No teams available for this season.</EmptyText>
      ) : (
        <motion.ul
          className="grid grid-cols-2 gap-3 lg:grid-cols-3"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          {teams.map((team) => (
            <li key={team.clubCode}>
              <MotionLink
                to={`/${seasonCode}/teams/${team.clubCode}`}
                className="card card-border bg-base-100 transition-colors hover:border-primary"
                variants={listItem}
                {...cardHover}
              >
                <div className="card-body items-center gap-2 p-3 text-center sm:flex-row sm:gap-3 sm:p-4 sm:text-left">
                  {/* A fixed slot, so a club without a crest (or one that fails to load) keeps its card's height and alignment. */}
                  <span className="flex h-10 w-10 flex-none items-center justify-center">
                    {team.crestUrl ? <RevealImage src={team.crestUrl} className="h-10 w-10 object-contain" /> : null}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold break-words">
                      <ShortLabel short={shortTeamName(team)} full={team.name ?? team.abbreviatedName ?? team.clubCode} />
                    </p>
                    <p className="muted text-sm">{team.countryCode ?? "-"}</p>
                  </div>
                </div>
              </MotionLink>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
