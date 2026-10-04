import { useState } from "react";
import { motion } from "motion/react";
import { EASE_OUT } from "./motion";

// "pop": a crest springs up from small. "wipe": a photo opens from its middle line outward, like a shutter.
const EFFECTS = {
  pop: {
    out: { opacity: 0, scale: 0.7 },
    in: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 380, damping: 24 } },
  },
  wipe: {
    out: { opacity: 0, clipPath: "inset(48% 0 48% 0)" },
    in: { opacity: 1, clipPath: "inset(0% 0 0% 0)", transition: { duration: 0.5, ease: EASE_OUT } },
  },
};

// An image that stays invisible until it has downloaded, then animates in. A failed image hides itself (the caller's
// fallback, if any, shows instead). `onLoad` and `onError` still fire for callers that want to follow along.
export default function RevealImage({ src, alt = "", effect = "pop", className = "", onLoad, onError, ...rest }) {
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);

  function markLoaded() {
    setLoadedSrc(src);
    onLoad?.();
  }

  // An image that was already cached is complete before React could attach onLoad.
  function attach(node) {
    if (node?.complete && node.naturalWidth > 0 && loadedSrc !== src) markLoaded();
  }

  if (failedSrc === src) return null;
  return (
    <motion.img
      ref={attach}
      src={src}
      alt={alt}
      className={className}
      variants={EFFECTS[effect]}
      initial="out"
      animate={loadedSrc === src ? "in" : "out"}
      onLoad={markLoaded}
      onError={() => {
        setFailedSrc(src);
        onError?.();
      }}
      {...rest}
    />
  );
}
