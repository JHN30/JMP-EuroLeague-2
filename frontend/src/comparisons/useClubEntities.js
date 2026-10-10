import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSeasonTeams } from "../lib/api";

// The two clubs of a team comparison as the tabs show them: the label is the club's abbreviated name (the full name from the picker
// until the teams load), with its crest and TV code from the season's teams.
export default function useClubEntities(seasonCode, entityA, entityB) {
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const teams = teamsQuery.data?.teams;
  return useMemo(() => {
    const decorate = (entity) => {
      const club = teams?.find((team) => team.clubCode === entity.id);
      return { ...entity, label: club?.abbreviatedName ?? entity.label, crestUrl: club?.crestUrl ?? null, tvCode: club?.tvCode ?? null };
    };
    return [decorate(entityA), decorate(entityB)];
  }, [teams, entityA, entityB]);
}
