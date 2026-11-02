import { useMemo, useState } from "react";
import AsyncState from "../lib/AsyncState";
import { SkeletonShooting } from "../lib/Skeleton";
import EmptyText from "../lib/EmptyText";
import { formatCount } from "../lib/format";
import { displayName, nameParts, titleCase } from "../lib/playerName";
import { usePlayerShots, usePositionShots } from "../lib/shootingData";
import { shotZone } from "../lib/shotZones";
import ShootingStudio from "../games/ShootingStudio";
import ShotRivalPicker from "./ShotRivalPicker";

// The two sides of the studio: the player's own shots, and the chosen player's (or every other player of his position).
const PLAYER_CODE = "PLAYER";
const OTHER_CODE = "OTHER";
// The picker's choice for the whole position, pooled.
const POOL_KEY = "all";
// A player is suggested as the closest match only with this many attempts, so a handful of shots never makes a profile.
const SIMILAR_MIN_ATTEMPTS = 20;

// "Guard" → "guard"; a season without positions compares with every player.
function positionLabel(position) {
  return position ? position.toLowerCase() : "player";
}

const plural = (label) => `${label}s`;
const surname = (fullName) => titleCase(nameParts(fullName).last);

// A player's shot profile: attempts, and the share of his located attempts in each kind of zone (left and right count as
// one, so the profile is where on the floor he shoots from, not which side).
function shotProfile(shots) {
  const zones = new Map();
  let located = 0;
  for (const shot of shots) {
    const zone = shotZone(shot);
    if (!zone) continue;
    const kind = zone.replace(/^(Left|Right) /, "");
    zones.set(kind, (zones.get(kind) ?? 0) + 1);
    located += 1;
  }
  return { attempts: shots.length, shares: new Map([...zones].map(([kind, count]) => [kind, count / located])) };
}

// How far apart two profiles are: the zone shares that differ (0 to 2), plus how different the attempts per game are
// (half the log of their ratio, so twice as many weighs about as much as a third of the shares moved).
function profileDistance(a, aGames, b, bGames) {
  const kinds = new Set([...a.shares.keys(), ...b.shares.keys()]);
  let shares = 0;
  for (const kind of kinds) shares += Math.abs((a.shares.get(kind) ?? 0) - (b.shares.get(kind) ?? 0));
  const volume = Math.abs(Math.log(a.attempts / Math.max(1, aGames) / (b.attempts / Math.max(1, bGames))));
  return shares + 0.5 * volume;
}

// The team Shooting tab's studio over one player: his shots against one other player of his position, picked from a search
// (the closest shot profile first), or against all of them pooled. Paint points and play-context counts are per game, since
// two players rarely play the same number. `games` is the player's game log, used to tell a phase with no games from one
// with no shots, and to count his games.
export default function PlayerShootingSection({ seasonCode, phaseCode, phaseName, player, games, personKey }) {
  const playedGames = games.filter((game) => game.phaseCode === phaseCode);
  const hasGames = playedGames.length > 0;
  const position = player.positionName ?? null;
  const own = usePlayerShots(seasonCode, personKey, phaseCode, hasGames);
  const field = usePositionShots(seasonCode, phaseCode, position, hasGames);
  const [choice, setChoice] = useState(null);
  const name = surname(player.name ?? player.jerseyName ?? "Player");
  const label = positionLabel(position);
  const poolName = `All ${plural(label)}`;

  // Every other shooter of the position with his shots, most attempts first, and the one whose profile is closest to his.
  const { others, shotsByPlayer, similar } = useMemo(() => {
    const byPlayer = new Map();
    for (const shot of field.shots) {
      if (shot.personCode === personKey) continue;
      const list = byPlayer.get(shot.personCode) ?? [];
      list.push(shot);
      byPlayer.set(shot.personCode, list);
    }
    const rows = field.players
      .filter((entry) => entry.personCode !== personKey && byPlayer.has(entry.personCode))
      .map((entry) => ({ ...entry, profile: shotProfile(byPlayer.get(entry.personCode)) }))
      .sort((a, b) => b.profile.attempts - a.profile.attempts);
    const mine = shotProfile(own.shots);
    const eligible = rows.filter((row) => row.profile.attempts >= SIMILAR_MIN_ATTEMPTS && row.games > 0);
    let closest = null;
    if (mine.attempts > 0) {
      for (const row of eligible.length > 0 ? eligible : rows) {
        const distance = profileDistance(mine, playedGames.length, row.profile, row.games);
        if (!closest || distance < closest.distance) closest = { key: row.personCode, distance };
      }
    }
    return { others: rows, shotsByPlayer: byPlayer, similar: closest?.key ?? null };
  }, [field.shots, field.players, own.shots, personKey, playedGames.length]);

  if (!hasGames) {
    return <EmptyText>No played games yet this phase to map shot locations from.</EmptyText>;
  }
  if (own.loading || field.loading) {
    return <AsyncState status="loading" label={`Loading ${label} shots`} skeleton={<SkeletonShooting />} />;
  }
  if (own.errored || field.errored) {
    return (
      <AsyncState
        status="error"
        message="Could not load this player's shot locations."
        onRetry={() => {
          if (own.errored) own.retry();
          if (field.errored) field.retry();
        }}
      />
    );
  }
  if (own.shots.length === 0) {
    return <EmptyText>No shot locations recorded for this player in this phase yet.</EmptyText>;
  }

  const selectedKey = choice ?? similar ?? POOL_KEY;
  const rival = selectedKey === POOL_KEY ? null : others.find((row) => row.personCode === selectedKey) ?? null;
  const poolGames = others.reduce((sum, row) => sum + row.games, 0);
  const otherShots = rival ? shotsByPlayer.get(rival.personCode) : others.flatMap((row) => shotsByPlayer.get(row.personCode));
  const sideShots = [
    ...own.shots.map((shot) => ({ ...shot, clubCode: PLAYER_CODE })),
    ...otherShots.map((shot) => ({ ...shot, clubCode: OTHER_CODE })),
  ];
  const otherName = rival ? surname(rival.name ?? rival.personCode) : poolName;
  const otherGames = rival ? rival.games : poolGames;
  const playerSide = { clubCode: PLAYER_CODE, name, abbreviatedName: name, tvCode: name, crestUrl: null };
  const otherSide = { clubCode: OTHER_CODE, name: otherName, abbreviatedName: otherName, tvCode: otherName, crestUrl: null };
  const gamesText = (count) => `${formatCount(count)} ${count === 1 ? "game" : "games"}`;

  const options = [
    { key: POOL_KEY, name: poolName, detail: `Every other ${label} pooled: ${formatCount(others.length)} players` },
    ...others.map((row) => ({
      key: row.personCode,
      name: displayName(row.name ?? row.personCode),
      short: row.club,
      detail: [row.club, `${formatCount(row.profile.attempts)} shots`, gamesText(row.games)].filter(Boolean).join(" · "),
      tag: row.personCode === similar ? "Most similar" : null,
    })),
  ];

  return (
    <>
      <ShootingStudio
        shots={sideShots}
        localTeam={playerSide}
        roadTeam={otherSide}
        playerFilterTeams={[]}
        playerTableTeams={[]}
        countScale={[1 / playedGames.length, 1 / Math.max(1, otherGames)]}
        initialPresentation="zones"
        sideHeadings={[null, <ShotRivalPicker key="picker" label={`Compare with a ${label}`} options={options} value={selectedKey} onChange={setChoice} />]}
        title={`${name} against ${rival ? otherName : `every ${label}`}${phaseName ? `, ${phaseName}` : ""}`}
        emptyText="No shot locations recorded in this phase yet."
      />
      <p className="muted mt-3 text-xs">
        {rival
          ? `The 2PT and 3PT lines and the zones are each player's ${phaseName ?? "phase"} totals.`
          : `${poolName}: every other ${label}'s shots in the ${phaseName ?? "phase"} pooled (${formatCount(others.length)} players), so their percentages and zones are the position's.`}{" "}
        Paint points and the play-context baskets and points are per game: {name} {gamesText(playedGames.length)}, {otherName}{" "}
        {rival ? gamesText(otherGames) : `${formatCount(otherGames)} player games`}.
      </p>
    </>
  );
}
