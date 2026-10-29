// The feed's portraits (750x1000) and crests are full-size PNGs. Both CDNs that host them resize on request, so a small
// picture asks for a WebP about twice its largest shown size, sharp on a high-density screen.
const RESIZING_HOSTS = ["media-cdn.cortextech.io", "media-cdn.incrowdsports.com"];

// A portrait is zoomed 1.7x onto the head in a circle of up to 56px; a crest is shown at up to 56px.
export const PORTRAIT_WIDTH = 192;
export const CREST_WIDTH = 128;

// The url on a resizing CDN at `width` as WebP. Anything else (no url, a local path, another host) comes back as it is.
export function sizedImageUrl(url, width) {
  if (!url) return url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!RESIZING_HOSTS.includes(parsed.host)) return url;
  parsed.searchParams.set("width", String(width));
  parsed.searchParams.set("format", "webp");
  return parsed.toString();
}
