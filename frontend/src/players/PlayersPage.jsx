import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonPlayers } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { cardHover, denseListContainer, listItem } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import PlayerPortrait from "../lib/PlayerPortrait";
import { nameParts } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import SearchField from "../lib/SearchField";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const MotionLink = motion.create(Link);

const PAGE_SIZE = 36;

function PlayerCard({ player, seasonCode }) {
  const { last, first } = nameParts(player.name ?? player.jerseyName ?? player.personKey);
  const details = [player.positionName, player.countryCode, player.heightCm ? `${player.heightCm} cm` : null].filter(Boolean);

  return (
    <MotionLink
      to={`/${seasonCode}/players/${player.personKey}`}
      className="group flex min-h-28 overflow-hidden rounded-box border border-base-300 bg-base-100 transition-colors hover:border-primary"
      variants={listItem}
      {...cardHover}
    >
      <PlayerPortrait imageUrl={player.imageUrl} className="w-20 sm:w-24" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="muted truncate text-[0.7rem] font-bold uppercase tracking-[0.18em]">{first}</p>
            <p className="truncate text-lg font-extrabold uppercase leading-tight">{last}</p>
          </div>
          {player.dorsal ? (
            <p className="flex-none text-2xl font-black leading-none tabular-nums">
              <span className="muted mr-0.5 text-sm font-bold">#</span>
              {player.dorsal}
            </p>
          ) : null}
        </div>
        {player.clubCode ? (
          <p className="flex min-w-0 items-center gap-2 text-sm">
            {player.crestUrl ? (
              <RevealImage src={player.crestUrl} loading="lazy" className="h-5 w-5 flex-none object-contain" />
            ) : null}
            <span className="truncate font-semibold">{player.clubName ?? player.clubCode}</span>
          </p>
        ) : null}
        <p className="muted truncate text-xs">{details.join(" · ")}</p>
      </div>
    </MotionLink>
  );
}

export default function PlayersPage() {
  useDocumentTitle("Players");
  const { seasonCode } = useParams();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
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
    queryKey: ["players", seasonCode, search, offset],
    queryFn: () => getSeasonPlayers(seasonCode, { search: search || undefined, limit: PAGE_SIZE, offset }),
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
        <EmptyText>{search ? "No players match your search. Try a different name." : "No players available for this season."}</EmptyText>
      ) : (
        <>
          <p ref={summaryRef} className="muted mb-3 scroll-mt-24 text-sm">
            Showing {offset + 1}-{offset + players.length} of {playersQuery.data?.pagination.total} players
          </p>
          {/* Keyed on the page's content, so a new page or search plays the entrance again, and a refetch does not. */}
          <motion.ul
            key={`${seasonCode}-${players[0].personKey}-${players.length}`}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
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
