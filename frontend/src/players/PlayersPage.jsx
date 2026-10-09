import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonPlayers } from "../lib/api";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { cardHover, denseListContainer, listItem } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import PlayerPortrait from "../lib/PlayerPortrait";
import { nameParts } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import SearchField from "../lib/SearchField";
import ShortLabel from "../lib/ShortLabel";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const MotionLink = motion.create(Link);

const PAGE_SIZE = 36;

function PlayerCard({ player, seasonCode }) {
  const { last, first } = nameParts(player.name ?? player.jerseyName ?? player.personKey);
  const details = [player.positionName, player.countryCode, player.heightCm ? `${player.heightCm} cm` : null].filter(Boolean);

  return (
    <MotionLink
      to={`/${seasonCode}/players/${player.personKey}`}
      className="group relative flex overflow-hidden rounded-box border border-base-300 bg-base-100 transition-colors hover:border-primary max-sm:flex-col sm:min-h-28"
      variants={listItem}
      {...cardHover}
    >
      {/* Below sm the portrait is the top of a stacked card and the shirt number a badge on its corner, so the surname gets the card's full width; from sm the portrait is the left side and the number sits beside the name. */}
      <PlayerPortrait imageUrl={player.imageUrl} className="max-sm:aspect-4/3 max-sm:w-full sm:w-24" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-2.5 pb-2.5 pt-2 sm:px-4 sm:py-3">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <p className="muted text-[0.7rem] font-bold uppercase tracking-[0.18em] max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate">{first}</p>
            <p className="text-sm font-extrabold uppercase leading-tight max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate sm:text-lg">{last}</p>
          </div>
          {player.dorsal ? (
            <p className="flex-none text-2xl font-black leading-none tabular-nums max-sm:absolute max-sm:right-1.5 max-sm:top-1.5 max-sm:rounded-field max-sm:bg-base-100/85 max-sm:px-1.5 max-sm:py-1 max-sm:text-lg">
              <span className="muted mr-0.5 text-sm font-bold">#</span>
              {player.dorsal}
            </p>
          ) : null}
        </div>
        {player.clubCode ? (
          <p className="flex min-w-0 items-center gap-1.5 text-sm sm:gap-2">
            {player.crestUrl ? (
              <RevealImage src={player.crestUrl} loading="lazy" className="h-5 w-5 flex-none object-contain" />
            ) : null}
            <span className="truncate font-semibold">
              <ShortLabel short={player.clubTvCode ?? player.clubCode} full={player.clubName ?? player.clubCode} />
            </span>
          </p>
        ) : null}
        <p className="muted text-xs max-sm:line-clamp-2 sm:truncate">{details.join(" · ")}</p>
      </div>
    </MotionLink>
  );
}

export default function PlayersPage() {
  useDocumentTitle("Players");
  const { seasonCode } = useParams();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  // The list asks for a name once typing pauses, not for every key.
  const debouncedSearch = useDebouncedValue(search);
  const summaryRef = useRef(null);
  const pageChanged = useRef(false);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setOffset(0);
  }

  function changePage(next) {
    pageChanged.current = true;
    setOffset(next);
  }

  const playersQuery = useQuery({
    queryKey: ["players", seasonCode, debouncedSearch, offset],
    queryFn: () => getSeasonPlayers(seasonCode, { search: debouncedSearch || undefined, limit: PAGE_SIZE, offset }),
    // Typing or paging keeps the cards on screen until the next ones arrive, instead of flashing a spinner.
    placeholderData: keepPreviousData,
  });

  const players = playersQuery.data?.players ?? [];

  // After Previous / Next, bring the top of the new page back into view (the buttons are at the bottom).
  useEffect(() => {
    if (!pageChanged.current || playersQuery.isPlaceholderData) return;
    pageChanged.current = false;
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [offset, playersQuery.isPlaceholderData]);

  return (
    <div>
      <PageHeader kicker="ROSTERS" title="Players" />

      <div className="mb-6">
        <SearchField
          label="Search players"
          placeholder="Search by name"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {playersQuery.isLoading ? (
        <AsyncState status="loading" label="Loading players" />
      ) : playersQuery.isError ? (
        <AsyncState status="error" message="Could not load players." onRetry={() => playersQuery.refetch()} />
      ) : players.length === 0 ? (
        <EmptyText>{debouncedSearch ? "No players match your search. Try a different name." : "No players available for this season."}</EmptyText>
      ) : (
        <>
          <p ref={summaryRef} className="muted mb-3 scroll-mt-24 text-sm">
            Showing {offset + 1}-{offset + players.length} of {playersQuery.data?.pagination.total} players
          </p>
          {/* Keyed on the page's content, so a new page or search plays the entrance again, and a refetch does not. */}
          <motion.ul
            key={`${seasonCode}-${players[0].personKey}-${players.length}`}
            className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4"
            variants={denseListContainer}
            initial="hidden"
            animate="show"
          >
            {players.map((player) => (
              <li key={player.personKey} className="contents">
                <PlayerCard player={player} seasonCode={seasonCode} />
              </li>
            ))}
          </motion.ul>

          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={offset === 0}
              onClick={() => changePage(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous page
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!playersQuery.data?.pagination.hasMore}
              onClick={() => changePage(offset + PAGE_SIZE)}
            >
              Next page
            </button>
          </div>
        </>
      )}
    </div>
  );
}
