import api from "./axios";

export async function getSeasons() {
  const { data } = await api.get("/seasons");
  return data;
}

export async function getSeasonGames(seasonCode, { limit, status, order } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/games`, {
    params: { limit, status, order },
  });
  return data;
}

export async function getPhases(seasonCode) {
  const { data } = await api.get(`/seasons/${seasonCode}/phases`);
  return data;
}

export async function getSeasonStandings(seasonCode, phaseCode, { round } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/phases/${phaseCode}/standings`, {
    params: { round },
  });
  return data;
}

export async function getLeaderStats(seasonCode, { phase, mode, limit } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/season-stats`, {
    params: { phase, mode, limit },
  });
  return data;
}
