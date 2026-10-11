import { useState } from "react";
import RevealImage from "./RevealImage";

// The photo of the leader on a leaders card, or a silhouette in its place when the feed has none (older seasons) or the photo does not load,
// so the card keeps its shape. Both take the card's `.kpi-chip-image` box.
export default function LeaderPhoto({ imageUrl }) {
  const [failedUrl, setFailedUrl] = useState(null);
  if (imageUrl && failedUrl !== imageUrl) {
    return <RevealImage src={imageUrl} effect="wipe" className="kpi-chip-image" onError={() => setFailedUrl(imageUrl)} />;
  }
  return (
    <svg viewBox="0 0 100 130" aria-hidden="true" className="kpi-chip-image aspect-100/130 text-base-content opacity-15" data-testid="leader-photo-placeholder">
      <circle cx="50" cy="44" r="21" fill="currentColor" />
      <path d="M8 130 C8 94 28 80 50 80 C72 80 92 94 92 130 Z" fill="currentColor" />
    </svg>
  );
}
