import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { cardHover, listContainer, listItem } from "../lib/motion";
import RevealImage from "../lib/RevealImage";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";

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
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
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
                <div className="card-body flex-row items-center gap-3 p-4">
                  {team.crestUrl ? (
                    <RevealImage src={team.crestUrl} className="h-10 w-10 object-contain" />
                  ) : null}
                  <div>
                    <p className="font-semibold">{team.name ?? team.abbreviatedName ?? team.clubCode}</p>
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
