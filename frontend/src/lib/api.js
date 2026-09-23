import api from "./axios";

export async function getSeasons() {
  const { data } = await api.get("/seasons");
  return data;
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

export async function getCoverage(seasonCode, { gameCode } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/coverage`, { params: { gameCode } });
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

export async function getLeaderStats(seasonCode, { phase, mode, limit, offset, sort, order } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/season-stats`, {
    params: { phase, mode, limit, offset, sort, order },
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
