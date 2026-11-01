import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonPlayers, getSeasonTeams } from "../lib/api";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import AsyncState from "../lib/AsyncState";
import { PlayerListSkeleton } from "./PlayersSkeleton";
import EmptyText from "../lib/EmptyText";
import { cardHover, denseListContainer, listItem } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import PlayerPortrait from "../lib/PlayerPortrait";
import { nameParts } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import SearchField from "../lib/SearchField";
import ShortLabel from "../lib/ShortLabel";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { ageAtSeasonStart } from "../lib/playerAge";

const MotionLink = motion.create(Link);

// Divisible by 2, 3, 4 and 5, so every row of the grid is full at every width.
const PAGE_SIZE = 60;
const POSITIONS = ["Guard", "Forward", "Center"];

function PlayerCard({ player, seasonCode }) {
  const { last, first } = nameParts(player.name ?? player.jerseyName ?? player.personKey);
  const age = ageAtSeasonStart(player.birthDate, seasonCode);
  // Two short lines, so five cards a row never cut the age off: who the player is, then the body.
  const role = [player.positionName, player.countryCode].filter(Boolean).join(" · ");
  const body = [player.heightCm ? `${player.heightCm} cm` : null, player.weightKg ? `${player.weightKg} kg` : null, age === null ? null : `${age} y`]
    .filter(Boolean)
    .join(" · ");

  return (
    <MotionLink
      to={`/${seasonCode}/players/${player.personKey}`}
      className="group relative flex overflow-hidden rounded-box border border-base-300 bg-base-100 transition-colors hover:border-primary max-sm:flex-col sm:min-h-22"
      variants={listItem}
      {...cardHover}
    >
      {/* Below sm the portrait is the top of a stacked card and the shirt number a badge on its corner, so the surname gets the card's full width; from sm the portrait is the left side and the number sits beside the name. */}
      <PlayerPortrait imageUrl={player.imageUrl} className="max-sm:aspect-4/3 max-sm:w-full sm:w-18" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 pb-2 pt-1.5 sm:px-3 sm:py-2">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <p className="muted text-[0.65rem] font-bold uppercase tracking-[0.18em] max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate">{first}</p>
            <p className="text-sm font-extrabold uppercase leading-tight max-sm:line-clamp-2 max-sm:wrap-break-word sm:truncate sm:text-base" title={last}>
              {last}
            </p>
          </div>
          {player.dorsal ? (
            <p className="flex-none text-xl font-black leading-none tabular-nums max-sm:absolute max-sm:right-1.5 max-sm:top-1.5 max-sm:rounded-field max-sm:bg-base-100/85 max-sm:px-1.5 max-sm:py-1 max-sm:text-lg">
              <span className="muted mr-0.5 text-xs font-bold">#</span>
              {player.dorsal}
            </p>
          ) : null}
        </div>
        {player.clubCode ? (
          <p className="flex min-w-0 items-center gap-1.5 text-sm">
            {player.crestUrl ? (
              <RevealImage src={player.crestUrl} loading="lazy" className="h-4 w-4 flex-none object-contain" />
            ) : null}
            <span className="truncate font-semibold">
              <ShortLabel short={player.clubTvCode ?? player.clubCode} full={player.clubName ?? player.clubCode} />
            </span>
          </p>
        ) : null}
        {role ? <p className="muted truncate text-xs">{role}</p> : null}
        {body ? <p className="muted truncate text-xs tabular-nums">{body}</p> : null}
      </div>
    </MotionLink>
  );
}

function emptyMessage(search, filtered) {
  if (search && filtered) return "No players match your search and filters.";
  if (filtered) return "No players match these filters.";
  if (search) return "No players match your search. Try a different name.";
  return "No players available for this season.";
}

export default function PlayersPage() {
  useDocumentTitle("Players");
  const { seasonCode } = useParams();
  const [search, setSearch] = useState("");
  const [club, setClub] = useState("");
  const [position, setPosition] = useState("");
  const [offset, setOffset] = useState(0);
  // The list asks for a name once typing pauses, not for every key.
  const debouncedSearch = useDebouncedValue(search);
  const summaryRef = useRef(null);
  const pageChanged = useRef(false);

  // Any change of the search or a filter starts again from the first page.
  function changeFilter(setter) {
    return (event) => {
      setter(event.target.value);
      setOffset(0);
    };
  }

  function changePage(next) {
    pageChanged.current = true;
    setOffset(next);
  }

  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const teams = [...(teamsQuery.data?.teams ?? [])].sort((a, b) => (a.name ?? a.clubCode).localeCompare(b.name ?? b.clubCode));

  const playersQuery = useQuery({
    queryKey: ["players", seasonCode, debouncedSearch, club, position, offset],
    queryFn: () =>
      getSeasonPlayers(seasonCode, {
        search: debouncedSearch || undefined,
        club: club || undefined,
        position: position || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
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

      {/* The search takes the row's room on a phone, with the two filters side by side under it; from sm all three share
          one row. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SearchField
          label="Search players"
          placeholder="Search by name"
          value={search}
          onChange={changeFilter(setSearch)}
          className="min-w-0 max-sm:max-w-none sm:flex-1"
        />
        <select aria-label="Club" className="select select-bordered select-sm min-w-0 max-sm:flex-1 sm:w-48" value={club} onChange={changeFilter(setClub)}>
          <option value="">All clubs</option>
          {teams.map((team) => (
            <option key={team.clubCode} value={team.clubCode}>
              {team.name ?? team.clubCode}
            </option>
          ))}
        </select>
        <select aria-label="Position" className="select select-bordered select-sm min-w-0 max-sm:flex-1 sm:w-36" value={position} onChange={changeFilter(setPosition)}>
          <option value="">All positions</option>
          {POSITIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {playersQuery.isLoading ? (
        <AsyncState status="loading" label="Loading players" skeleton={<PlayerListSkeleton />} />
      ) : playersQuery.isError ? (
        <AsyncState status="error" message="Could not load players." onRetry={() => playersQuery.refetch()} />
      ) : players.length === 0 ? (
        <EmptyText>{emptyMessage(debouncedSearch, Boolean(club || position))}</EmptyText>
      ) : (
        <>
          <p ref={summaryRef} className="muted mb-3 scroll-mt-24 text-sm">
            Showing {offset + 1}-{offset + players.length} of {playersQuery.data?.pagination.total} players
          </p>
          {/* Keyed on the page's content, so a new page or search plays the entrance again, and a refetch does not. */}
          <motion.ul
            key={`${seasonCode}-${players[0].personKey}-${players.length}`}
            className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
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
