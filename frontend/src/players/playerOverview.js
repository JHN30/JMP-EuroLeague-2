// What the player Overview ranks: a per-game stat against every player who has recorded stats in the phase.

export function statNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

// The season line at the top of the Overview.
export const SEASON_LINE = [
  { label: "PTS", title: "Points per game", group: "traditional", field: "pointsScored" },
  { label: "REB", title: "Rebounds per game", group: "traditional", field: "totalRebounds" },
  { label: "AST", title: "Assists per game", group: "traditional", field: "assists" },
  { label: "STL", title: "Steals per game", group: "traditional", field: "steals" },
  { label: "BLK", title: "Blocks per game", group: "traditional", field: "blocks" },
  { label: "PIR", title: "Performance index rating per game", group: "traditional", field: "pir" },
  { label: "MIN", title: "Minutes per game", group: "traditional", field: "minutesPlayed" },
];

// The six axes of the percentile radar.
export const PROFILE_AXES = [
  { key: "scoring", label: "Scoring", group: "traditional", field: "pointsScored" },
  { key: "valuation", label: "Valuation", group: "traditional", field: "pir" },
  { key: "rebounding", label: "Rebounding", group: "traditional", field: "totalRebounds" },
  { key: "playmaking", label: "Playmaking", group: "traditional", field: "assists" },
  { key: "steals", label: "Steals", group: "traditional", field: "steals" },
  { key: "shooting", label: "Shooting", group: "advanced", field: "trueShootingPercentage" },
];

// Competition ranking (1, 2, 2, 4) of one player on one stat, highest first (lowest first when `lowerIsBetter`).
// With `qualifiedOnly` the pool is the players who meet the season and phase minimum of games (the database says who
// does), so a player with two games does not top a per-game table. `rank` is null for a player without a value, or
// one outside the pool; `unqualified` says it was the minimum that kept them out.
export function rankPlayer(players, personKey, { group, field, lowerIsBetter = false }, { qualifiedOnly = false } = {}) {
  const pool = qualifiedOnly ? players.filter((player) => player.qualified !== false) : players;
  const own = players.find((player) => player.personKey === personKey);
  const value = statNumber(own?.[group]?.[field]);
  const valued = pool.map((player) => statNumber(player[group]?.[field])).filter((number) => number !== null);
  if (value === null) return { value: null, rank: null, of: valued.length, percentile: null };
  if (qualifiedOnly && own.qualified === false) return { value, rank: null, of: valued.length, percentile: null, unqualified: true };
  const rank = valued.filter((number) => (lowerIsBetter ? number < value : number > value)).length + 1;
  const percentile = valued.length > 1 ? Math.round(((valued.length - rank) / (valued.length - 1)) * 100) : 100;
  return { value, rank, of: valued.length, percentile };
}
