import api from "./axios";

export async function getSeasons() {
  const { data } = await api.get("/seasons");
  return data;
}

export async function getSeasonGames(seasonCode, { limit } = {}) {
  const { data } = await api.get(`/seasons/${seasonCode}/games`, {
    params: limit === undefined ? undefined : { limit },
  });
  return data;
}
