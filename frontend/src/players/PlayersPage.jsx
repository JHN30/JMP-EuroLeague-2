import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getSeasonPlayers } from "../lib/api";

const PAGE_SIZE = 20;

function CenteredSpinner() {
  return (
    <div className="flex justify-center py-12">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function ErrorAlert({ message, onRetry }) {
  return (
    <div role="alert" className="alert alert-error max-w-md">
      <span>{message}</span>
      <button type="button" className="btn btn-sm" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export default function PlayersPage() {
  const { seasonCode } = useParams();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setOffset(0);
  }

  const playersQuery = useQuery({
    queryKey: ["players", seasonCode, search, offset],
    queryFn: () => getSeasonPlayers(seasonCode, { search: search || undefined, limit: PAGE_SIZE, offset }),
  });

  const players = playersQuery.data?.players ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Players</h1>

      <div className="mb-6">
        <input
          type="search"
          aria-label="Search players"
          placeholder="Search by name"
          className="input input-bordered input-sm w-full max-w-xs"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {playersQuery.isLoading ? (
        <CenteredSpinner />
      ) : playersQuery.isError ? (
        <ErrorAlert message="Could not load players." onRetry={() => playersQuery.refetch()} />
      ) : players.length === 0 ? (
        <p className="muted">{search ? "No players match your search." : "No players available for this season."}</p>
      ) : (
        <>
          <div className="panel p-4">
            <ul>
              {players.map((player) => (
                <li key={player.personKey} className="flex items-center justify-between gap-4 border-b border-base-300 py-2 last:border-0">
                  <Link to={`/${seasonCode}/players/${player.personKey}`} className="link link-hover font-medium">
                    {player.name ?? player.jerseyName ?? player.personKey}
                  </Link>
                  <span className="muted text-sm">{player.countryCode ?? "-"}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={offset === 0}
              onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            >
              Previous page
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!playersQuery.data?.pagination.hasMore}
              onClick={() => setOffset((current) => current + PAGE_SIZE)}
            >
              Next page
            </button>
          </div>
        </>
      )}
    </div>
  );
}
