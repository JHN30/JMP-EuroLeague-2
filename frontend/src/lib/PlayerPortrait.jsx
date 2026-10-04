import { useState } from "react";
import RevealImage from "./RevealImage";

// Stands in for a portrait the feed does not have (a player who has not played, and every coach).
function Silhouette() {
  return (
    <svg viewBox="0 0 100 130" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-full w-full text-base-content opacity-20">
      <circle cx="50" cy="44" r="21" fill="currentColor" />
      <path d="M8 130 C8 94 28 80 50 80 C72 80 92 94 92 130 Z" fill="currentColor" />
    </svg>
  );
}

// The portrait when there is one and it loads, otherwise only the silhouette, never the two together. While the photo
// downloads a shimmer holds its place, then the photo opens in over it. It fills its parent's height, so the caller sets
// the width (and a parent with `group` makes the photo zoom on hover).
export default function PlayerPortrait({ imageUrl, className = "w-24 sm:w-28" }) {
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
            src={imageUrl}
            effect="wipe"
            loading="lazy"
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
