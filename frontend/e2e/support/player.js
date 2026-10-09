import { HEIGHT, seasonSlug } from "./layout";

const API = "http://localhost:3000/api/seasons";

// A player of the current season who also played in an earlier one, so the career tab has several seasons to show.
// Returns the address of that player's page and the season code.
export async function veteranPlayer(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const earlier = [...seasons].sort((a, b) => a.startYear - b.startYear)[0].seasonCode;
  const { players } = await (await page.request.get(`${API}/${code}/players?limit=36`)).json();
  for (const player of players) {
    const response = await page.request.get(`${API}/${earlier}/players/${player.personKey}`);
    if (response.ok()) return { href: `/${slug}/players/${player.personKey}`, seasonCode: code, personKey: player.personKey, slug };
  }
  throw new Error("No player of the current season also played in the earliest season");
}
