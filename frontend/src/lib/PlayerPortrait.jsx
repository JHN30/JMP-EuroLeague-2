import { useState } from "react";
import { sizedImageUrl, sizedSrcSet } from "./imageSize";
import RevealImage from "./RevealImage";

// The feed's portraits are 750 wide; these copies cover the boxes from a 24px game-card scorer to a full-width phone card.
const PORTRAIT_WIDTHS = [192, 384, 640];

// Stands in for a portrait the feed does not have (a player who has not played, most players of the older seasons, and every
// coach). It fills its parent, which must be positioned; the small round avatars use it too.
export function Silhouette() {
  return (
    <svg viewBox="0 0 100 130" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-full w-full text-base-content opacity-20">
      <circle cx="50" cy="44" r="21" fill="currentColor" />
      <path d="M8 130 C8 94 28 80 50 80 C72 80 92 94 92 130 Z" fill="currentColor" />
    </svg>
  );
}

// The portrait when there is one and it loads, otherwise only the silhouette, never the two together. While the photo
// downloads a shimmer holds its place, then the photo opens in over it. It fills its parent's height, so the caller sets
// the width (and a parent with `group` makes the photo zoom on hover). `sizes` tells the browser that width, so it downloads the
// smallest copy that stays sharp; `eager` loads it at once (the player page's own portrait).
export default function PlayerPortrait({ imageUrl, className = "w-24 sm:w-28", sizes = "(max-width: 639px) 96px, 112px", eager = false }) {
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [failedUrl, setFailedUrl] = useState(null);
  const showPhoto = Boolean(imageUrl) && failedUrl !== imageUrl;
  const loading = showPhoto && loadedUrl !== imageUrl;

  return (
    <div className={`relative flex-none overflow-hidden bg-neutral ${className}`}>
      {loading ? <div aria-hidden="true" className="image-shimmer absolute inset-0" /> : null}
      {showPhoto ? (
        <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
          <RevealImage
            src={sizedImageUrl(imageUrl, PORTRAIT_WIDTHS[1])}
            srcSet={sizedSrcSet(imageUrl, PORTRAIT_WIDTHS)}
            sizes={sizes}
            effect="wipe"
            loading={eager ? "eager" : "lazy"}
            className="h-full w-full object-cover object-top"
            onLoad={() => setLoadedUrl(imageUrl)}
            onError={() => setFailedUrl(imageUrl)}
          />
        </div>
      ) : (
        <Silhouette />
      )}
    </div>
  );
}
