import AsyncState from "./AsyncState";
import { competitionNotes } from "./seasonFormat";
import { useSeasonFormat } from "./useSeasonFormat";

export default function CompetitionContext({ seasonCode, gameCode, phaseCode, roundNumber, clubCode }) {
  const query = useSeasonFormat(seasonCode);
  if (query.isLoading) return <p role="status" className="muted mb-4 text-sm">Loading competition context.</p>;
  if (query.isError) return <div className="mb-4"><AsyncState compact status="error" message="Additional competition context is unavailable." onRetry={() => query.refetch()} /></div>;
  const notes = competitionNotes(query.data, seasonCode, { gameCode, phaseCode, roundNumber, clubCode });
  if (notes.length === 0) return null;
  return (
    <aside aria-label="Competition context" className="mb-4 rounded-box border border-base-300 bg-base-200/40 p-3 text-sm">
      {notes.map((entry) => <p key={`${entry.kind}-${entry.gameCode ?? entry.clubCode}`}>{entry.note}</p>)}
    </aside>
  );
}
