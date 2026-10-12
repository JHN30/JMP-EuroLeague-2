import { HEIGHT, seasonSlug } from "./layout";

const API = "http://localhost:3000/api/seasons";

// A player of the current season who also played in an earlier one, so the career tab has several seasons to show.
// Returns the address of that player's page and the season code.
export async function veteranPlayer(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const current = seasons.find((season) => season.seasonCode.endsWith(slug));
  const code = current.seasonCode;
  // The season just before, not the earliest: the local database reaches back to 2000-01, long before any current player.
  const earlier = [...seasons].filter((season) => season.startYear < current.startYear).sort((a, b) => b.startYear - a.startYear)[0].seasonCode;
  const { players } = await (await page.request.get(`${API}/${code}/players?limit=36`)).json();
  for (const player of players) {
    const response = await page.request.get(`${API}/${earlier}/players/${player.personKey}`);
    if (response.ok()) return { href: `/${slug}/players/${player.personKey}`, seasonCode: code, personKey: player.personKey, slug };
  }
  throw new Error("No player of the current season also played in the season before");
}
