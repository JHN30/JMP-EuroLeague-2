import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonStandings, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { TeamListSkeleton } from "./TeamsSkeleton";
import EmptyText from "../lib/EmptyText";
import { cardHover, listContainer, listItem } from "../lib/motion";
import { readableName } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { shortTeamName } from "../games/gameUtils";
import { groupPositionLabel, isGroupedTable } from "../standings/standingsGroups";
import { ordinal } from "./teamLeague";

const MotionLink = motion.create(Link);

// Cities the feed spells wrongly or unlike the rest (after recasing), shown corrected until the warehouse is fixed.
const CITY_NAMES = {
  Ovarense: "Ovar",
  Roma: "Rome",
  Napoli: "Naples",
  "St Petersburg": "Saint Petersburg",
  "Nizhni Nóvgorod": "Nizhny Novgorod",
  Cantu: "Cantù",
  Malaga: "Málaga",
  Kiev: "Kyiv",
  "Karsıyaka, İzmir": "İzmir",
};

function cityName(city) {
  if (!city) return null;
  const name = readableName(city);
  return CITY_NAMES[name] ?? name;
}

// "3rd · 22-12", or "Group A · 2nd · 22-12" when the regular season is split into groups. Nothing before the club's first game.
function recordLine(entry, grouped) {
  const basic = entry?.basic;
  if (!basic || basic.position == null || (basic.gamesWon ?? 0) + (basic.gamesLost ?? 0) === 0) return null;
  const place = (grouped ? groupPositionLabel(entry) : null) ?? ordinal(basic.position);
  return `${place} · ${basic.gamesWon ?? 0}-${basic.gamesLost ?? 0}`;
}

export default function TeamsPage() {
  useDocumentTitle("Teams");
  const { seasonCode } = useParams();

  const teamsQuery = useQuery({
    queryKey: ["teams", seasonCode],
    queryFn: () => getSeasonTeams(seasonCode),
  });
  // The regular-season table the Home and Games pages share; while it loads, or if it fails, the cards have no record line.
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });

  const teams = teamsQuery.data?.teams ?? [];
  const standings = standingsQuery.data?.standings ?? [];
  const standingByClubCode = new Map(standings.map((entry) => [entry.clubCode, entry]));
  const grouped = isGroupedTable(standings);

  return (
    <div>
      <PageHeader kicker="CLUBS" title="Teams" />

      {teamsQuery.isLoading ? (
        <AsyncState status="loading" label="Loading teams" skeleton={<TeamListSkeleton />} />
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
          {teams.map((team) => {
            const city = cityName(team.city);
            const record = recordLine(standingByClubCode.get(team.clubCode), grouped);
            return (
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
                      <p className="muted text-sm break-words">{[city, team.countryCode].filter(Boolean).join(" · ") || "-"}</p>
                      {record ? <p className="muted text-xs tabular-nums">{record}</p> : null}
                    </div>
                  </div>
                </MotionLink>
              </li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
