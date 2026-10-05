import api from "./axios";
import { seasonSlug } from "./seasonSlug";

// The seasons come back with the year as their code ("2026"), the same form the site's addresses and the API accept.
export async function getSeasons() {
  const { data } = await api.get("/seasons");
  return { ...data, seasons: data.seasons.map((season) => ({ ...season, seasonCode: seasonSlug(season.seasonCode) })) };
}

export async function getSeasonGames(seasonCode, { limit, offset, status, order, phase, round } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/games`, {
    params: { limit, offset, status, order, phase, round },
  });
  return data;
}

export async function getGame(seasonCode, gameCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/games/${gameCode}`);
  return data;
}

export async function getBoxScore(seasonCode, gameCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/games/${gameCode}/box-score`);
  return data;
}

export async function getGameAdvanced(seasonCode, gameCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/games/${gameCode}/advanced`);
  return data;
}

export async function getGameTeamFlow(seasonCode, gameCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/games/${gameCode}/team-flow`);
  return data;
}

export async function getGameLineups(seasonCode, gameCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/games/${gameCode}/lineups`);
  return data;
}

export async function getPlayByPlay(seasonCode, gameCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/games/${gameCode}/play-by-play`);
  return data;
}

export async function getPostseasonSeries(seasonCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/postseason-series`);
  return data;
}

export async function getShots(seasonCode, gameCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/games/${gameCode}/shots`);
  return data;
}

export async function getPhases(seasonCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/phases`);
  return data;
}

export async function getRounds(seasonCode, phaseCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/phases/${phaseCode}/rounds`);
  return data;
}

export async function getSeasonStandings(seasonCode, phaseCode, { round } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/phases/${phaseCode}/standings`, {
    params: { round },
  });
  return data;
}

export async function getPhaseResults(seasonCode, phaseCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/phases/${phaseCode}/results`);
  return data;
}

export async function getGameFlow(seasonCode, { scope } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/advanced/game-flow`, {
    params: { scope },
  });
  return data;
}

export async function getAdvancedStandings(seasonCode, { scope, round } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/advanced/standings`, {
    params: { scope, round },
  });
  return data;
}

// `offset` and `limit` page through the players who qualify (the response carries their `total`); `order: "asc"` ranks the
// lowest first, for the stats where less is better.
export async function getAdvancedLeaders(seasonCode, { metric, scope, minMinutes, limit, offset, order } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/advanced/leaders`, {
    params: { metric, scope, minMinutes, limit, offset, order },
  });
  return data;
}

// Every qualified player's per-game numbers over their last `games` games and over the phase, and their rank on each stat
// now and before the latest round (hot right now, and who has moved).
export async function getLeaderForm(seasonCode, { phase, games } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/leaders/form`, { params: { phase, games } });
  return data;
}

// `qualified: true` keeps only players who meet the season and phase minimum of games (a leaderboard's default);
// `minGames` keeps players with at least that many games instead.
export async function getLeaderStats(seasonCode, { phase, mode, limit, offset, sort, order, qualified, minGames } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/season-stats`, {
    params: { phase, mode, limit, offset, sort, order, qualified, minGames },
  });
  return data;
}

export async function getSeasonTeams(seasonCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/teams`);
  return data;
}

export async function getTeam(seasonCode, clubCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/teams/${clubCode}`);
  return data;
}

export async function getTeamRoster(seasonCode, clubCode, { limit, offset } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/teams/${clubCode}/roster`, {
    params: { limit, offset },
  });
  return data;
}

export async function getTeamPlayersAdvanced(seasonCode, clubCode, { scope } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/teams/${clubCode}/players-advanced`, {
    params: { scope },
  });
  return data;
}

export async function getTeamCoaches(seasonCode, clubCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/teams/${clubCode}/coaches`);
  return data;
}

export async function getTeamGames(seasonCode, clubCode, { limit, offset, status, order } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/teams/${clubCode}/games`, {
    params: { limit, offset, status, order },
  });
  return data;
}

export async function getTeamStatsSummary(seasonCode, clubCode, phase) {
  const { data } = await api.get(`/seasons/${seasonCode}/teams/${clubCode}/team-stats`, {
    params: { phase },
  });
  return data;
}

export async function getLeagueTeamStats(seasonCode, phase) {
  const { data } = await api.get(`/seasons/${seasonCode}/team-stats`, {
    params: { phase },
  });
  return data;
}

export async function getTeamAdvanced(seasonCode, clubCode, { scope } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/teams/${clubCode}/advanced`, {
    params: { scope },
  });
  return data;
}

export async function getTeamLineups(seasonCode, clubCode, { scope, size, minPossessions, limit } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/teams/${clubCode}/lineups`, {
    params: { scope, size, minPossessions, limit },
  });
  return data;
}

export async function getSeasonPlayers(seasonCode, { search, limit, offset } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/players`, {
    params: { search, limit, offset },
  });
  return data;
}

export async function getPlayer(seasonCode, personKey) {
  const { data } = await api.get(`/seasons/${seasonCode}/players/${personKey}`);
  return data;
}

export async function getPlayerAdvanced(seasonCode, personKey, { scope, extended } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/players/${personKey}/advanced`, {
    params: { scope, extended: extended ? "true" : undefined },
  });
  return data;
}

export async function getPlayerRegistrations(seasonCode, personKey) {
  const { data } = await api.get(`/seasons/${seasonCode}/players/${personKey}/registrations`);
  return data;
}

export async function getPlayerSeasonStats(seasonCode, personKey, { phase, mode } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/season-stats`, {
    params: { phase, mode, personKey },
  });
  return data;
}

export async function getPlayerGames(seasonCode, personKey, { limit, offset } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/players/${personKey}/games`, {
    params: { limit, offset },
  });
  return data;
}

export async function getPlayerSeasonRecords(seasonCode, metric) {
  const { data } = await api.get(`/seasons/${seasonCode}/records/player-seasons`, { params: { metric } });
  return data;
}

export async function getSingleGameRecords(seasonCode, metric) {
  const { data } = await api.get(`/seasons/${seasonCode}/records/single-games`, { params: { metric } });
  return data;
}

export async function getTeamSeasonRecords(seasonCode, metric) {
  const { data } = await api.get(`/seasons/${seasonCode}/records/team-seasons`, { params: { metric } });
  return data;
}
