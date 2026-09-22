import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getCoverage } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import DataCoveragePanel from "../lib/DataCoveragePanel";

export default function SeasonCoverage() {
  const { seasonCode } = useParams();

  const coverageQuery = useQuery({
    queryKey: ["coverage", seasonCode],
    queryFn: () => getCoverage(seasonCode),
  });

  if (coverageQuery.isLoading) {
    return <AsyncState status="loading" label="Loading season data coverage" compact />;
  }
  if (coverageQuery.isError) {
    return <AsyncState status="error" inline message="Could not load this season's data coverage." />;
  }

  return <DataCoveragePanel coverage={coverageQuery.data} title="Season data coverage" />;
}
