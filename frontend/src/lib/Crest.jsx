import { useState } from "react";
import RevealImage from "./RevealImage";
import { CREST_WIDTH, HEADER_CREST_WIDTH, sizedImageUrl } from "./imageSize";

// A club's crest, decorative (alt=""), at the resized width for its box: `header` for the big header crests, otherwise the
// small one. `className` carries the size and any layout classes. It pops in once downloaded (RevealImage) unless
// `animate={false}`, loads near the screen unless `eager`, and with `keepSlot` leaves an empty box of the same size when there
// is no crest or it fails to load, so the layout does not move.
export default function Crest({ url, className = "", header = false, eager = false, animate = true, keepSlot = false }) {
  const [failedUrl, setFailedUrl] = useState(null);
  if (!url || failedUrl === url) return keepSlot ? <span aria-hidden="true" className={className} /> : null;
  const src = sizedImageUrl(url, header ? HEADER_CREST_WIDTH : CREST_WIDTH);
  const imageClass = `object-contain ${className}`;
  const loading = eager ? "eager" : "lazy";
  const onError = () => setFailedUrl(url);
  if (animate) return <RevealImage src={src} loading={loading} className={imageClass} onError={onError} />;
  return <img src={src} loading={loading} decoding="async" alt="" className={imageClass} onError={onError} />;
}
