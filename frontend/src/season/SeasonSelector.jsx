import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router";
import CompactFilterSelect from "../lib/CompactFilterSelect";
import { getSeasons } from "../lib/api";

export default function SeasonSelector() {
  const { seasonCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: getSeasons });

  if (!seasonsQuery.data) return null;

  function handleChange(event) {
    const nextSeasonCode = event.target.value;
    const segments = location.pathname.split("/");
    segments[1] = nextSeasonCode;
    navigate({ pathname: segments.join("/") || "/", search: location.search, hash: location.hash });
  }

  return (
    <CompactFilterSelect
      label="Selected season"
      className="touch-target"
      value={seasonCode}
      onChange={handleChange}
    >
      {seasonsQuery.data.seasons.map((season) => (
        <option key={season.seasonCode} value={season.seasonCode}>
          {season.name ?? season.seasonCode}
        </option>
      ))}
    </CompactFilterSelect>
  );
}
